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

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/html, */*',
  'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
};

@Injectable()
export class NoonScraper {
  private readonly logger = new Logger(NoonScraper.name);
  private readonly BASE_URL = 'https://www.noon.com';
  private readonly API_URL = 'https://api.noon.com/catalog/v3/search';

  async search(query: string, page = 1): Promise<ScrapedProduct[]> {
    try {
      // Noon has a public catalog API
      const response = await axios.get(this.API_URL, {
        params: {
          q: query,
          limit: 24,
          offset: (page - 1) * 24,
          country: 'sa',
          language: 'en',
          sort_by: 'popularity',
        },
        headers: {
          ...HEADERS,
          'x-noon-client-id': 'pwa-web',
          'x-noon-locale': 'en-sa',
          'Referer': `${this.BASE_URL}/saudi-en/search/?q=${encodeURIComponent(query)}`,
        },
        timeout: 15000,
      });

      const hits = response.data?.hits || response.data?.results || [];

      return hits.map((item: any): ScrapedProduct => {
        const price = parseFloat(item.price?.now || item.sale_price || item.price || '0');
        const originalPrice = parseFloat(item.price?.was || item.old_price || '0');

        return {
          id: String(item.id || item.sku),
          name: item.name || item.title || '',
          price,
          originalPrice: originalPrice > price ? originalPrice : undefined,
          url: `${this.BASE_URL}/saudi-en/product/${item.slug || item.id}/`,
          image: item.thumbnail || item.image_url || item.images?.[0],
          rating: parseFloat(item.rating || '0') || undefined,
          reviewCount: parseInt(item.reviews_count || item.review_count || '0') || undefined,
          inStock: item.is_available !== false && item.stock_status !== 'out_of_stock',
          brand: item.brand?.name || item.brand,
        };
      }).filter((p: ScrapedProduct) => p.price > 0 && p.name);

    } catch (err: any) {
      this.logger.error(`Noon search failed for "${query}": ${err.message}`);
      
      // Try HTML fallback
      return this.scrapeHtml(query);
    }
  }

  private async scrapeHtml(query: string): Promise<ScrapedProduct[]> {
    try {
      const url = `${this.BASE_URL}/saudi-en/search/?q=${encodeURIComponent(query)}`;
      const response = await axios.get(url, {
        headers: {
          ...HEADERS,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 20000,
      });

      // Extract __NEXT_DATA__ JSON from page
      const match = response.data.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (!match) return [];

      const nextData = JSON.parse(match[1]);
      const pageProps = nextData?.props?.pageProps;
      const hits = pageProps?.initialState?.search?.hits || 
                   pageProps?.searchResults?.hits || [];

      return hits.map((item: any): ScrapedProduct => ({
        id: String(item.id || item.sku),
        name: item.name || '',
        price: parseFloat(item.price?.now || item.price || '0'),
        originalPrice: parseFloat(item.price?.was || '0') || undefined,
        url: `${this.BASE_URL}/saudi-en/product/${item.slug || item.id}/`,
        image: item.thumbnail,
        rating: parseFloat(item.rating) || undefined,
        reviewCount: parseInt(item.reviewsCount) || undefined,
        inStock: item.isAvailable !== false,
      })).filter((p: ScrapedProduct) => p.price > 0);

    } catch (err: any) {
      this.logger.error(`Noon HTML scrape failed: ${err.message}`);
      return [];
    }
  }

  async getProduct(productId: string): Promise<ScrapedProduct | null> {
    try {
      const response = await axios.get(
        `${this.API_URL.replace('/search', '/product')}/${productId}`,
        {
          params: { country: 'sa', language: 'en' },
          headers: HEADERS,
          timeout: 10000,
        },
      );

      const item = response.data?.product || response.data;
      if (!item) return null;

      return {
        id: String(item.id),
        name: item.name,
        price: parseFloat(item.price?.now || '0'),
        originalPrice: parseFloat(item.price?.was || '0') || undefined,
        url: `${this.BASE_URL}/saudi-en/product/${item.slug}/`,
        image: item.thumbnail,
        rating: parseFloat(item.rating) || undefined,
        reviewCount: parseInt(item.reviewsCount) || undefined,
        inStock: item.isAvailable !== false,
        brand: item.brand?.name,
      };
    } catch (err: any) {
      this.logger.error(`Noon getProduct failed: ${err.message}`);
      return null;
    }
  }
}
