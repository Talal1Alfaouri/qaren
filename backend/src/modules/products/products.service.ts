import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database.service';
import { CacheService } from '../../common/cache.service';
import { MatchingEngine } from '../../common/matching.engine';
import { AffiliateService } from '../affiliate/affiliate.service';

export interface SearchParams {
  q?: string;
  category?: string;
  brand?: string;
  store?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'price_asc' | 'price_desc' | 'relevance' | 'popular';
  page?: number;
  limit?: number;
  lang?: 'en' | 'ar';
}

export interface UpsertOfferParams {
  storeSlug: string;
  storeProductId: string;
  storeUrl: string;
  productName: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  isAvailable?: boolean;
  brand?: string;
  categorySlug?: string;
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private db: DatabaseService,
    private cache: CacheService,
    private matcher: MatchingEngine,
    private affiliate: AffiliateService,
  ) {}

  async search(params: SearchParams) {
    const {
      q = '',
      category,
      brand,
      store,
      minPrice,
      maxPrice,
      sort = 'relevance',
      page = 1,
      limit = 24,
      lang = 'en',
    } = params;

    const cacheKey = `search:${JSON.stringify(params)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const offset = (page - 1) * limit;

    let orderBy = 'p.view_count DESC';
    if (sort === 'price_asc') orderBy = 'min_price ASC NULLS LAST';
    if (sort === 'price_desc') orderBy = 'min_price DESC NULLS LAST';
    if (sort === 'relevance' && q) orderBy = 'ts_rank(p.search_vector, query) DESC';

    const result = await this.db.sql`
      WITH query AS (
        SELECT to_tsquery('simple', ${q ? q.split(/\s+/).filter(Boolean).join(' & ') + ':*' : "''"}) as q
      ),
      product_prices AS (
        SELECT 
          o.product_id,
          MIN(o.price) as min_price,
          MAX(o.price) as max_price,
          COUNT(DISTINCT o.store_id) as store_count,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'store_slug', s.slug,
              'store_name_en', s.name_en,
              'store_name_ar', s.name_ar,
              'store_logo', s.logo_url,
              'price', o.price,
              'original_price', o.original_price,
              'affiliate_url', o.affiliate_url,
              'store_url', o.store_url,
              'is_available', o.is_available,
              'rating', o.rating,
              'review_count', o.review_count
            ) ORDER BY o.price ASC
          ) as offers
        FROM offers o
        JOIN stores s ON s.id = o.store_id
        WHERE o.is_available = true
          AND (${minPrice}::numeric IS NULL OR o.price >= ${minPrice})
          AND (${maxPrice}::numeric IS NULL OR o.price <= ${maxPrice})
          AND (${store} IS NULL OR s.slug = ${store})
        GROUP BY o.product_id
      )
      SELECT 
        p.id,
        p.slug,
        p.name_en,
        p.name_ar,
        p.image_urls,
        p.specs,
        p.view_count,
        c.slug as category_slug,
        c.name_en as category_name_en,
        c.name_ar as category_name_ar,
        b.name as brand_name,
        pp.min_price,
        pp.max_price,
        pp.store_count,
        pp.offers,
        COUNT(*) OVER() as total_count
      FROM products p
      JOIN product_prices pp ON pp.product_id = p.id
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN brands b ON b.id = p.brand_id
      CROSS JOIN query
      WHERE p.is_active = true
        AND (${q} = '' OR p.search_vector @@ query.q OR p.name_en ILIKE ${'%' + q + '%'} OR p.name_ar ILIKE ${'%' + q + '%'})
        AND (${category} IS NULL OR c.slug = ${category})
        AND (${brand} IS NULL OR LOWER(b.name) = LOWER(${brand}))
      ORDER BY ${this.db.sql.unsafe(orderBy)}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const total = result[0]?.totalCount || 0;
    const data = {
      products: result,
      total: parseInt(total),
      page,
      limit,
      totalPages: Math.ceil(parseInt(total) / limit),
    };

    await this.cache.set(cacheKey, data, 300); // 5 min cache
    return data;
  }

  async getBySlug(slug: string) {
    const cacheKey = `product:${slug}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const [product] = await this.db.sql`
      SELECT 
        p.*,
        c.slug as category_slug,
        c.name_en as category_name_en,
        c.name_ar as category_name_ar,
        b.name as brand_name,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', o.id,
            'store_slug', s.slug,
            'store_name_en', s.name_en,
            'store_name_ar', s.name_ar,
            'store_logo', s.logo_url,
            'price', o.price,
            'original_price', o.original_price,
            'affiliate_url', o.affiliate_url,
            'store_url', o.store_url,
            'is_available', o.is_available,
            'rating', o.rating,
            'review_count', o.review_count,
            'last_scraped_at', o.last_scraped_at
          ) ORDER BY o.price ASC NULLS LAST
        ) FILTER (WHERE o.id IS NOT NULL) as offers
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN offers o ON o.product_id = p.id
      LEFT JOIN stores s ON s.id = o.store_id
      WHERE p.slug = ${slug} AND p.is_active = true
      GROUP BY p.id, c.slug, c.name_en, c.name_ar, b.name
    `;

    if (!product) throw new NotFoundException(`Product not found: ${slug}`);

    // Increment view count async
    this.db.sql`UPDATE products SET view_count = view_count + 1 WHERE id = ${product.id}`.catch(() => {});

    await this.cache.set(cacheKey, product, 600);
    return product;
  }

  async getPriceHistory(productId: string, days = 30) {
    const cacheKey = `price_history:${productId}:${days}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const result = await this.db.sql`
      SELECT 
        ph.recorded_at,
        ph.price,
        ph.is_available,
        s.slug as store_slug,
        s.name_en as store_name
      FROM price_history ph
      JOIN stores s ON s.id = ph.store_id
      WHERE ph.product_id = ${productId}
        AND ph.recorded_at > NOW() - INTERVAL '${this.db.sql.unsafe(days.toString())} days'
      ORDER BY ph.recorded_at ASC
    `;

    await this.cache.set(cacheKey, result, 1800);
    return result;
  }

  async getCategories() {
    const cacheKey = 'categories:all';
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const result = await this.db.sql`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
      WHERE c.parent_id IS NULL
      GROUP BY c.id
      ORDER BY c.sort_order ASC
    `;

    await this.cache.set(cacheKey, result, 3600);
    return result;
  }

  async getFeaturedDeals(limit = 12) {
    const cacheKey = `deals:featured:${limit}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // Products with biggest price drops or best availability across stores
    const result = await this.db.sql`
      SELECT 
        p.id, p.slug, p.name_en, p.name_ar, p.image_urls,
        MIN(o.price) as min_price,
        MAX(o.original_price) as max_original_price,
        COUNT(DISTINCT o.store_id) as store_count,
        ROUND(((MAX(o.original_price) - MIN(o.price)) / NULLIF(MAX(o.original_price), 0) * 100)::numeric, 0) as discount_pct
      FROM products p
      JOIN offers o ON o.product_id = p.id AND o.is_available = true
      WHERE p.is_active = true AND o.original_price > o.price
      GROUP BY p.id, p.slug, p.name_en, p.name_ar, p.image_urls
      HAVING MAX(o.original_price) > MIN(o.price) * 1.05
      ORDER BY discount_pct DESC NULLS LAST, p.view_count DESC
      LIMIT ${limit}
    `;

    await this.cache.set(cacheKey, result, 600);
    return result;
  }

  // Core function: upsert offer with smart product matching
  async upsertOffer(params: UpsertOfferParams): Promise<{ productId: string; isNew: boolean }> {
    const {
      storeSlug, storeProductId, storeUrl, productName,
      price, originalPrice, imageUrl, rating, reviewCount,
      isAvailable = true, brand, categorySlug,
    } = params;

    // Get store
    const [store] = await this.db.sql`SELECT * FROM stores WHERE slug = ${storeSlug}`;
    if (!store) {
      this.logger.warn(`Store not found: ${storeSlug}`);
      return { productId: '', isNew: false };
    }

    // Check if offer already exists
    const [existingOffer] = await this.db.sql`
      SELECT o.*, p.id as product_id FROM offers o
      JOIN products p ON p.id = o.product_id
      WHERE o.store_id = ${store.id} AND o.store_product_id = ${storeProductId}
    `;

    const affiliateUrl = this.affiliate.buildAffiliateUrl({
      storeSlug,
      originalUrl: storeUrl,
      affiliateUrlTemplate: store.affiliateUrlTemplate,
    });

    if (existingOffer) {
      // Update price and log history if changed
      const priceChanged = parseFloat(existingOffer.price) !== price;

      await this.db.sql`
        UPDATE offers SET
          price = ${price},
          original_price = ${originalPrice || null},
          is_available = ${isAvailable},
          store_url = ${storeUrl},
          affiliate_url = ${affiliateUrl},
          rating = ${rating || null},
          review_count = ${reviewCount || 0},
          last_scraped_at = NOW(),
          updated_at = NOW()
        WHERE id = ${existingOffer.id}
      `;

      if (priceChanged) {
        await this.db.sql`
          INSERT INTO price_history (offer_id, product_id, store_id, price, is_available)
          VALUES (${existingOffer.id}, ${existingOffer.productId}, ${store.id}, ${price}, ${isAvailable})
        `;
      }

      await this.cache.delPattern(`product:*`);
      return { productId: existingOffer.productId, isNew: false };
    }

    // New offer: try to match existing product
    const brandName = brand || this.matcher.extractBrand(productName);
    
    // Get candidates from same brand/category for matching
    const candidates = await this.db.sql`
      SELECT p.id, p.name_en as "nameEn", p.name_ar as "nameAr", p.normalized_tokens
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      WHERE p.is_active = true
        AND (${brandName} IS NULL OR LOWER(b.name) = LOWER(${brandName}))
      LIMIT 200
    `;

    const { match, score } = this.matcher.findBestMatch(
      { name: productName, brand: brandName },
      candidates,
    );

    let productId: string;
    let isNew = false;

    if (match) {
      productId = match.id;
      this.logger.log(`Matched product: "${productName}" → "${match.nameEn}" (${score.toFixed(3)})`);
    } else {
      // Create new unified product
      const slug = this.matcher.generateSlug(productName);
      const tokens = this.matcher.tokenize(productName);

      // Get or create brand
      let brandId: string | null = null;
      if (brandName) {
        const brandSlug = brandName.toLowerCase().replace(/\s+/g, '-');
        const [existingBrand] = await this.db.sql`
          INSERT INTO brands (slug, name) VALUES (${brandSlug}, ${brandName})
          ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
          RETURNING id
        `;
        brandId = existingBrand.id;
      }

      // Get category
      let categoryId: string | null = null;
      if (categorySlug) {
        const [cat] = await this.db.sql`SELECT id FROM categories WHERE slug = ${categorySlug}`;
        categoryId = cat?.id || null;
      }

      const [newProduct] = await this.db.sql`
        INSERT INTO products (
          slug, name_en, category_id, brand_id, 
          image_urls, normalized_tokens
        ) VALUES (
          ${slug}, ${productName}, ${categoryId}, ${brandId},
          ${imageUrl ? [imageUrl] : []}, ${tokens}
        )
        ON CONFLICT (slug) DO UPDATE SET
          name_en = EXCLUDED.name_en,
          updated_at = NOW()
        RETURNING id
      `;

      productId = newProduct.id;
      isNew = true;
      this.logger.log(`Created new product: "${productName}" (${productId})`);
    }

    // Create offer
    const [newOffer] = await this.db.sql`
      INSERT INTO offers (
        product_id, store_id, store_product_id, store_url, affiliate_url,
        price, original_price, is_available, rating, review_count,
        store_image_url
      ) VALUES (
        ${productId}, ${store.id}, ${storeProductId}, ${storeUrl}, ${affiliateUrl},
        ${price}, ${originalPrice || null}, ${isAvailable}, ${rating || null},
        ${reviewCount || 0}, ${imageUrl || null}
      )
      ON CONFLICT (store_id, store_product_id) DO UPDATE SET
        price = EXCLUDED.price,
        affiliate_url = EXCLUDED.affiliate_url,
        last_scraped_at = NOW()
      RETURNING id
    `;

    // Initial price history record
    await this.db.sql`
      INSERT INTO price_history (offer_id, product_id, store_id, price, is_available)
      VALUES (${newOffer.id}, ${productId}, ${store.id}, ${price}, ${isAvailable})
    `;

    await this.cache.delPattern(`product:*`);
    await this.cache.delPattern(`search:*`);

    return { productId, isNew };
  }

  async trackClick(offerId: string, data: {
    sessionId?: string;
    ipHash?: string;
    userAgent?: string;
    referrer?: string;
  }) {
    const [offer] = await this.db.sql`
      SELECT o.*, s.id as store_id FROM offers o
      JOIN stores s ON s.id = o.store_id
      WHERE o.id = ${offerId}
    `;

    if (!offer) return;

    await this.db.sql`
      INSERT INTO clicks (product_id, offer_id, store_id, session_id, ip_hash, user_agent, referrer)
      VALUES (${offer.productId}, ${offerId}, ${offer.storeId}, 
              ${data.sessionId || null}, ${data.ipHash || null},
              ${data.userAgent || null}, ${data.referrer || null})
    `;

    // Increment view counter in cache for real-time analytics
    await this.cache.incr(`clicks:store:${offer.storeId}`);
    await this.cache.expire(`clicks:store:${offer.storeId}`, 86400);
  }
}
