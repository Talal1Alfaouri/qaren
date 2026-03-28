import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface ScrapedProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  url: string;
  image?: string;
  rating?: number;
  reviewCount?: number;
  inStock: boolean;
  brand?: string;
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

// ─── Al-Manea Scraper ─────────────────────────────────────────────────────────
@Injectable()
export class AlManeaScraper {
  private readonly logger = new Logger(AlManeaScraper.name);
  private readonly BASE = 'https://www.almanea.sa';

  async search(query: string): Promise<ScrapedProduct[]> {
    try {
      // Al-Manea uses Magento 2 with GraphQL
      const res = await axios.post(
        `${this.BASE}/graphql`,
        {
          query: `
            query ($search: String!) {
              products(search: $search, pageSize: 20) {
                items {
                  sku name url_key
                  thumbnail { url }
                  price_range {
                    minimum_price {
                      final_price { value }
                      regular_price { value }
                    }
                  }
                  stock_status
                  rating_summary review_count
                }
              }
            }
          `,
          variables: { search: query },
        },
        {
          headers: {
            'User-Agent': UA,
            'Content-Type': 'application/json',
            'Store': 'en',
          },
          timeout: 15000,
        },
      );

      return (res.data?.data?.products?.items || []).map((item: any): ScrapedProduct => {
        const mp = item.price_range?.minimum_price;
        const final = mp?.final_price?.value || 0;
        const regular = mp?.regular_price?.value || 0;
        return {
          id: item.sku,
          name: item.name,
          price: final,
          originalPrice: regular > final ? regular : undefined,
          url: `${this.BASE}/${item.url_key}`,
          image: item.thumbnail?.url,
          rating: item.rating_summary ? item.rating_summary / 20 : undefined,
          reviewCount: item.review_count || undefined,
          inStock: item.stock_status === 'IN_STOCK',
        };
      }).filter((p: ScrapedProduct) => p.price > 0);

    } catch (err: any) {
      this.logger.error(`Al-Manea search failed for "${query}": ${err.message}`);
      return [];
    }
  }
}

// ─── Al-Saif Gallery Scraper ──────────────────────────────────────────────────
@Injectable()
export class AlSaifScraper {
  private readonly logger = new Logger(AlSaifScraper.name);
  private readonly BASE = 'https://www.alsaifgallery.com';

  async search(query: string): Promise<ScrapedProduct[]> {
    try {
      // Al-Saif also uses Magento
      const res = await axios.get(
        `${this.BASE}/rest/V1/products`,
        {
          params: {
            'searchCriteria[filter_groups][0][filters][0][field]': 'name',
            'searchCriteria[filter_groups][0][filters][0][value]': `%${query}%`,
            'searchCriteria[filter_groups][0][filters][0][condition_type]': 'like',
            'searchCriteria[pageSize]': 20,
            fields: 'items[id,sku,name,price,custom_attributes,extension_attributes,media_gallery_entries]',
          },
          headers: { 'User-Agent': UA },
          timeout: 15000,
        },
      );

      return (res.data?.items || []).map((item: any): ScrapedProduct => {
        const image = item.media_gallery_entries?.[0]?.file
          ? `${this.BASE}/pub/media/catalog/product${item.media_gallery_entries[0].file}`
          : undefined;

        const urlKey = item.custom_attributes?.find((a: any) => a.attribute_code === 'url_key')?.value;
        const specialPrice = item.custom_attributes?.find((a: any) => a.attribute_code === 'special_price')?.value;
        const finalPrice = specialPrice ? parseFloat(specialPrice) : item.price;

        return {
          id: item.sku || String(item.id),
          name: item.name,
          price: finalPrice || item.price,
          originalPrice: specialPrice ? item.price : undefined,
          url: urlKey ? `${this.BASE}/${urlKey}.html` : `${this.BASE}/catalog/product/view/id/${item.id}`,
          image,
          inStock: item.extension_attributes?.stock_item?.is_in_stock !== false,
        };
      }).filter((p: ScrapedProduct) => p.price > 0);

    } catch (err: any) {
      this.logger.error(`Al-Saif search failed for "${query}": ${err.message}`);
      return this.scrapeHtml(query);
    }
  }

  private async scrapeHtml(query: string): Promise<ScrapedProduct[]> {
    try {
      const res = await axios.get(
        `${this.BASE}/catalogsearch/result/?q=${encodeURIComponent(query)}`,
        { headers: { 'User-Agent': UA }, timeout: 20000 },
      );
      return this.extractJsonLd(res.data);
    } catch {
      return [];
    }
  }

  private extractJsonLd(html: string): ScrapedProduct[] {
    const products: ScrapedProduct[] = [];
    const matches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
    for (const m of matches) {
      try {
        const d = JSON.parse(m[1]);
        if (d['@type'] === 'Product' && d.offers?.price) {
          products.push({
            id: d.sku || d.productID || Math.random().toString(36).slice(2),
            name: d.name,
            price: parseFloat(d.offers.price),
            url: d.url,
            image: Array.isArray(d.image) ? d.image[0] : d.image,
            inStock: d.offers.availability?.includes('InStock') ?? true,
          });
        }
      } catch { /* skip */ }
    }
    return products;
  }
}

// ─── SACO Scraper ─────────────────────────────────────────────────────────────
@Injectable()
export class SacoScraper {
  private readonly logger = new Logger(SacoScraper.name);
  private readonly BASE = 'https://www.saco.sa';

  async search(query: string): Promise<ScrapedProduct[]> {
    try {
      // SACO uses a headless commerce API
      const res = await axios.get(
        `${this.BASE}/api/catalog/products/search`,
        {
          params: { q: query, limit: 20, page: 1, lang: 'en' },
          headers: {
            'User-Agent': UA,
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          timeout: 15000,
        },
      );

      const items = res.data?.data || res.data?.products || res.data?.items || [];

      return items.map((item: any): ScrapedProduct => {
        const price = parseFloat(item.price || item.sale_price || '0');
        const originalPrice = parseFloat(item.original_price || item.regular_price || '0');
        return {
          id: item.sku || item.id || Math.random().toString(36).slice(2),
          name: item.name || item.title || '',
          price,
          originalPrice: originalPrice > price ? originalPrice : undefined,
          url: item.url?.startsWith('http') ? item.url : `${this.BASE}${item.url || ''}`,
          image: item.thumbnail || item.image,
          inStock: item.in_stock !== false && item.stock_status !== 'out_of_stock',
          brand: item.brand,
        };
      }).filter((p: ScrapedProduct) => p.price > 0 && p.name);

    } catch (err: any) {
      this.logger.error(`SACO search failed for "${query}": ${err.message}`);
      return this.scrapeJsonLd(query);
    }
  }

  private async scrapeJsonLd(query: string): Promise<ScrapedProduct[]> {
    try {
      const res = await axios.get(
        `${this.BASE}/search?q=${encodeURIComponent(query)}`,
        { headers: { 'User-Agent': UA }, timeout: 20000 },
      );

      const products: ScrapedProduct[] = [];
      const ldMatches = res.data.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);

      for (const m of ldMatches) {
        try {
          const d = JSON.parse(m[1]);
          const items = d['@type'] === 'ItemList' ? d.itemListElement?.map((e: any) => e.item) : [d];
          for (const item of items || []) {
            if (item?.['@type'] === 'Product' && item.offers) {
              const price = parseFloat(item.offers.price || item.offers.lowPrice || '0');
              if (!price) continue;
              products.push({
                id: item.sku || Math.random().toString(36).slice(2),
                name: item.name,
                price,
                url: item.url || item.offers.url,
                image: Array.isArray(item.image) ? item.image[0] : item.image,
                inStock: item.offers.availability?.includes('InStock') ?? true,
              });
            }
          }
        } catch { /* skip */ }
      }

      return products;
    } catch {
      return [];
    }
  }
}
