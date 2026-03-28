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

const COMMON_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/html, */*',
  'Accept-Language': 'en-US,en;q=0.9',
};

@Injectable()
export class JarirScraper {
  private readonly logger = new Logger(JarirScraper.name);
  private readonly BASE_URL = 'https://www.jarir.com';

  async search(query: string): Promise<ScrapedProduct[]> {
    try {
      // Jarir uses Magento, has REST API
      const response = await axios.get(
        `${this.BASE_URL}/graphql`,
        {
          method: 'POST',
          headers: { ...COMMON_HEADERS, 'Content-Type': 'application/json' },
          data: {
            query: `
              query searchProducts($search: String!) {
                products(search: $search, pageSize: 24) {
                  items {
                    id
                    sku
                    name
                    url_key
                    image { url }
                    price_range {
                      minimum_price {
                        regular_price { value currency }
                        final_price { value }
                      }
                    }
                    rating_summary
                    review_count
                    stock_status
                  }
                }
              }
            `,
            variables: { search: query },
          },
          timeout: 15000,
        },
      );

      const items = response.data?.data?.products?.items || [];

      return items.map((item: any): ScrapedProduct => {
        const minPrice = item.price_range?.minimum_price;
        const regularPrice = minPrice?.regular_price?.value || 0;
        const finalPrice = minPrice?.final_price?.value || regularPrice;

        return {
          id: item.sku || String(item.id),
          name: item.name,
          price: finalPrice,
          originalPrice: regularPrice > finalPrice ? regularPrice : undefined,
          url: `${this.BASE_URL}/${item.url_key}`,
          image: item.image?.url,
          rating: item.rating_summary ? item.rating_summary / 20 : undefined, // Magento uses 0-100 scale
          reviewCount: item.review_count || undefined,
          inStock: item.stock_status === 'IN_STOCK',
        };
      }).filter((p: ScrapedProduct) => p.price > 0);

    } catch (err: any) {
      this.logger.error(`Jarir search failed for "${query}": ${err.message}`);
      return this.scrapeHtml(query);
    }
  }

  private async scrapeHtml(query: string): Promise<ScrapedProduct[]> {
    try {
      const url = `${this.BASE_URL}/catalogsearch/result/?q=${encodeURIComponent(query)}`;
      const response = await axios.get(url, { headers: COMMON_HEADERS, timeout: 20000 });
      const html = response.data;

      const products: ScrapedProduct[] = [];
      
      // Extract JSON-LD structured data
      const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
      for (const match of jsonLdMatches) {
        try {
          const data = JSON.parse(match[1]);
          if (data['@type'] === 'Product') {
            const offer = data.offers || {};
            products.push({
              id: data.sku || data.productID || Math.random().toString(36).slice(2),
              name: data.name,
              price: parseFloat(offer.price || '0'),
              url: data.url || url,
              image: data.image?.[0] || data.image,
              rating: data.aggregateRating?.ratingValue,
              reviewCount: data.aggregateRating?.reviewCount,
              inStock: offer.availability?.includes('InStock') || true,
            });
          }
        } catch { /* skip */ }
      }

      return products.filter((p) => p.price > 0);
    } catch (err: any) {
      this.logger.error(`Jarir HTML scrape failed: ${err.message}`);
      return [];
    }
  }
}

@Injectable()
export class ExtraScraper {
  private readonly logger = new Logger(ExtraScraper.name);
  private readonly BASE_URL = 'https://www.extra.com';
  private readonly API_URL = 'https://api.extra.com';

  async search(query: string): Promise<ScrapedProduct[]> {
    try {
      // Extra uses Hybris/SAP Commerce with REST API
      const response = await axios.get(
        `${this.API_URL}/extrastores/v2/sa/products/search`,
        {
          params: {
            query: `${query}:relevance`,
            currentPage: 0,
            pageSize: 24,
            lang: 'en',
            curr: 'SAR',
          },
          headers: {
            ...COMMON_HEADERS,
            'X-Anonymous-Consents': '%5B%5D',
            'Referer': `${this.BASE_URL}/en-sa/`,
          },
          timeout: 15000,
        },
      );

      const results = response.data?.products || [];

      return results.map((item: any): ScrapedProduct => {
        const price = parseFloat(item.price?.value || item.formattedPrice?.replace(/[^\d.]/g, '') || '0');
        const wasPrice = parseFloat(item.wasPrice?.value || '0');

        return {
          id: item.code || item.sku,
          name: item.name,
          price,
          originalPrice: wasPrice > price ? wasPrice : undefined,
          url: `${this.BASE_URL}/en-sa${item.url}`,
          image: item.images?.[0]?.url ? `${this.API_URL}${item.images[0].url}` : undefined,
          rating: item.averageRating || undefined,
          reviewCount: item.numberOfReviews || undefined,
          inStock: item.stock?.stockLevelStatus === 'inStock',
          brand: item.brand?.name,
        };
      }).filter((p: ScrapedProduct) => p.price > 0);

    } catch (err: any) {
      this.logger.error(`Extra search failed for "${query}": ${err.message}`);
      return [];
    }
  }
}
