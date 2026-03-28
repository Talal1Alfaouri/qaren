import 'dotenv/config';
import postgres from 'postgres';
import { NoonPlaywrightScraper, JarirPlaywrightScraper } from './playwright-scrapers';

const sql = postgres(process.env.DATABASE_URL!, { transform: postgres.camel });

const SEARCH_QUERIES = [
  { query: 'iPhone 15', category: 'mobiles', brand: 'Apple' },
  { query: 'iPhone 15 Pro', category: 'mobiles', brand: 'Apple' },
  { query: 'Samsung Galaxy S24', category: 'mobiles', brand: 'Samsung' },
  { query: 'Samsung Galaxy S24 Ultra', category: 'mobiles', brand: 'Samsung' },
  { query: 'Google Pixel 8', category: 'mobiles', brand: 'Google' },
  { query: 'MacBook Pro M3', category: 'laptops', brand: 'Apple' },
  { query: 'MacBook Air M2', category: 'laptops', brand: 'Apple' },
  { query: 'Dell XPS 15', category: 'laptops', brand: 'Dell' },
  { query: 'HP Spectre x360', category: 'laptops', brand: 'HP' },
  { query: 'Samsung QLED 55 inch 4K', category: 'tvs', brand: 'Samsung' },
  { query: 'LG OLED 55 inch', category: 'tvs', brand: 'LG' },
  { query: 'Sony Bravia 65 inch 4K', category: 'tvs', brand: 'Sony' },
  { query: 'AirPods Pro', category: 'audio', brand: 'Apple' },
  { query: 'Sony WH-1000XM5', category: 'audio', brand: 'Sony' },
  { query: 'Samsung refrigerator', category: 'home-appliances', brand: 'Samsung' },
  { query: 'Dyson vacuum cleaner', category: 'home-appliances', brand: 'Dyson' },
  { query: 'PlayStation 5', category: 'gaming', brand: 'Sony' },
  { query: 'Apple Watch Series 9', category: 'wearables', brand: 'Apple' },
  { query: 'Samsung Galaxy Watch 6', category: 'wearables', brand: 'Samsung' },
  { query: 'iPad Pro M4', category: 'tablets', brand: 'Apple' },
];

async function upsertProduct(
  storeSlug: string,
  product: any,
  categorySlug: string,
  brandName?: string,
) {
  try {
    // Get store
    const [store] = await sql`SELECT * FROM stores WHERE slug = ${storeSlug}`;
    if (!store) return;

    // Get or create brand
    let brandId: string | null = null;
    const brand = brandName || extractBrand(product.name);
    if (brand) {
      const slug = brand.toLowerCase().replace(/\s+/g, '-');
      const [b] = await sql`
        INSERT INTO brands (slug, name) VALUES (${slug}, ${brand})
        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `;
      brandId = b.id;
    }

    // Get category
    const [category] = await sql`SELECT id FROM categories WHERE slug = ${categorySlug}`;

    // Generate slug
    const productSlug = generateSlug(product.name);

    // Upsert product
    const tokens = tokenize(product.name);
    const [p] = await sql`
      INSERT INTO products (slug, name_en, category_id, brand_id, image_urls, normalized_tokens)
      VALUES (
        ${productSlug}, ${product.name},
        ${category?.id || null}, ${brandId},
        ${product.image ? [product.image] : []},
        ${tokens}
      )
      ON CONFLICT (slug) DO UPDATE SET
        updated_at = NOW(),
        image_urls = CASE 
          WHEN array_length(EXCLUDED.image_urls, 1) > 0 THEN EXCLUDED.image_urls 
          ELSE products.image_urls 
        END
      RETURNING id
    `;

    // Build affiliate URL
    const affiliateUrl = buildAffiliateUrl(storeSlug, product.url, store.affiliateUrlTemplate, store.affiliateId);

    // Upsert offer
    const [offer] = await sql`
      INSERT INTO offers (
        product_id, store_id, store_product_id, store_url, affiliate_url,
        price, original_price, is_available, store_image_url, last_scraped_at
      ) VALUES (
        ${p.id}, ${store.id}, ${String(product.id)}, ${product.url}, ${affiliateUrl},
        ${product.price}, ${product.originalPrice || null}, ${product.inStock},
        ${product.image || null}, NOW()
      )
      ON CONFLICT (store_id, store_product_id) DO UPDATE SET
        price = EXCLUDED.price,
        original_price = EXCLUDED.original_price,
        is_available = EXCLUDED.is_available,
        store_url = EXCLUDED.store_url,
        affiliate_url = EXCLUDED.affiliate_url,
        last_scraped_at = NOW(),
        updated_at = NOW()
      RETURNING id, (xmax = 0) as inserted
    `;

    // Log price history
    await sql`
      INSERT INTO price_history (offer_id, product_id, store_id, price, is_available)
      VALUES (${offer.id}, ${p.id}, ${store.id}, ${product.price}, ${product.inStock})
    `;

    return { productId: p.id, offerId: offer.id };
  } catch (err: any) {
    console.error(`Failed to upsert ${product.name}: ${err.message}`);
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 250);
}

function tokenize(text: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'in', 'on', 'with', 'for', 'smart', 'new']);
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !stopWords.has(t));
}

function extractBrand(name: string): string | null {
  const brands = ['Apple', 'Samsung', 'LG', 'Sony', 'Xiaomi', 'Huawei', 'Google', 'OnePlus',
    'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'MSI', 'Dyson', 'Bosch', 'Siemens',
    'Panasonic', 'Philips', 'Hisense', 'TCL'];
  const lower = name.toLowerCase();
  return brands.find((b) => lower.includes(b.toLowerCase())) || null;
}

function buildAffiliateUrl(storeSlug: string, url: string, template?: string, affiliateId?: string): string {
  if (storeSlug === 'amazon-sa') {
    const tag = process.env.AMAZON_AFFILIATE_TAG || 'qaren-21';
    try {
      const u = new URL(url);
      u.searchParams.set('tag', tag);
      return u.toString();
    } catch { return url; }
  }
  if (template && affiliateId) {
    return template.replace('{url}', encodeURIComponent(url)).replace('{affiliate_id}', affiliateId);
  }
  // Tracking redirect fallback
  const encoded = Buffer.from(url).toString('base64url');
  return `${process.env.SITE_URL || 'https://qaren.sa'}/go/${storeSlug}?u=${encoded}`;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runScraper(stores: string[] = ['noon', 'jarir']) {
  console.log(`\n🚀 Qaren Scraper starting...`);
  console.log(`📦 Queries: ${SEARCH_QUERIES.length}`);
  console.log(`🏪 Stores: ${stores.join(', ')}\n`);

  const scrapers: Record<string, any> = {};

  if (stores.includes('noon')) {
    scrapers.noon = new NoonPlaywrightScraper();
    await scrapers.noon.init();
  }
  if (stores.includes('jarir')) {
    scrapers.jarir = new JarirPlaywrightScraper();
    await scrapers.jarir.init();
  }

  let totalProducts = 0;

  for (const { query, category, brand } of SEARCH_QUERIES) {
    for (const [storeSlug, scraper] of Object.entries(scrapers)) {
      console.log(`\n[${storeSlug.toUpperCase()}] Scraping: "${query}"...`);

      try {
        const products = await scraper.searchProducts(query);
        console.log(`  ✓ Found ${products.length} products`);

        for (const product of products) {
          await upsertProduct(storeSlug, product, category, brand);
          totalProducts++;
        }

        // Polite delay between requests
        await sleep(2000 + Math.random() * 3000);
      } catch (err: any) {
        console.error(`  ✗ Error: ${err.message}`);
      }
    }
  }

  // Cleanup
  for (const scraper of Object.values(scrapers)) {
    await (scraper as any).close?.();
  }

  await sql.end();
  console.log(`\n✅ Done! Processed ${totalProducts} product offers.`);
}

// ─── CLI Entry ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const storeArg = args.find((a) => a.startsWith('--store='))?.split('=')[1] ||
                 (args.includes('--store') ? args[args.indexOf('--store') + 1] : 'all');

const targetStores = storeArg === 'all' ? ['noon', 'jarir'] : [storeArg];
runScraper(targetStores).catch(console.error);
