import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  asin?: string;
}

@Injectable()
export class AmazonScraper {
  private readonly logger = new Logger(AmazonScraper.name);
  private readonly BASE_URL = 'https://www.amazon.sa';
  private readonly affiliateTag: string;

  constructor(private config: ConfigService) {
    this.affiliateTag = config.get('AMAZON_AFFILIATE_TAG', 'qaren-21');
  }

  async search(query: string): Promise<ScrapedProduct[]> {
    try {
      // Amazon's search endpoint
      const url = `${this.BASE_URL}/s`;
      const response = await axios.get(url, {
        params: {
          k: query,
          'ref': 'nb_sb_noss',
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'max-age=0',
        },
        timeout: 20000,
      });

      return this.parseSearchResults(response.data);
    } catch (err: any) {
      this.logger.error(`Amazon search failed for "${query}": ${err.message}`);
      return [];
    }
  }

  private parseSearchResults(html: string): ScrapedProduct[] {
    const products: ScrapedProduct[] = [];

    // Extract product data from search result JSON embedded in page
    const dataPattern = /data-asin="([A-Z0-9]{10})"[\s\S]*?data-component-type="s-search-result"/g;

    // Parse price
    const extractPrice = (html: string, asin: string): number => {
      const pricePattern = new RegExp(
        `${asin}[\\s\\S]*?class="[^"]*a-price[^"]*"[^>]*>[\\s\\S]*?<span[^>]*>(\\d+[.,]\\d+)<\\/span>`,
        'm'
      );
      const match = pricePattern.exec(html);
      if (match) return parseFloat(match[1].replace(',', '.'));
      return 0;
    };

    // Extract __NEXT_DATA__ or similar
    const jsonMatch = html.match(/window\.__SEARCH_RESULT_DATA__\s*=\s*({[\s\S]*?});/);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        const items = data?.searchResult?.items || [];
        for (const item of items) {
          const asin = item.asin;
          const price = parseFloat(item.price?.amount || '0');
          if (!asin || !price) continue;

          products.push({
            id: asin,
            asin,
            name: item.title?.displayValue || '',
            price,
            originalPrice: parseFloat(item.price?.strikethroughAmount || '0') || undefined,
            url: `${this.BASE_URL}/dp/${asin}?tag=${this.affiliateTag}`,
            image: item.image?.highRes || item.image?.url,
            rating: parseFloat(item.stars?.value || '0') || undefined,
            reviewCount: parseInt(item.numberOfRatings?.displayValue?.replace(',', '') || '0') || undefined,
            inStock: !item.outOfStock,
            brand: item.brand?.value,
          });
        }
        return products;
      } catch {
        // Fall through to regex parsing
      }
    }

    // Regex-based fallback parsing
    const asinMatches = [...html.matchAll(/data-asin="([A-Z0-9]{10})"/g)];
    const seenAsins = new Set<string>();

    for (const match of asinMatches) {
      const asin = match[1];
      if (seenAsins.has(asin) || asin === 'undefined') continue;
      seenAsins.add(asin);

      // Extract surrounding HTML block for this ASIN
      const asinIndex = match.index!;
      const block = html.substring(asinIndex, asinIndex + 3000);

      // Extract title
      const titleMatch = block.match(/class="[^"]*a-text-normal[^"]*"[^>]*>([^<]+)</);
      const name = titleMatch ? titleMatch[1].trim() : '';
      if (!name) continue;

      // Extract price
      const priceMatch = block.match(/class="[^"]*a-price-whole[^"]*"[^>]*>(\d+)</);
      const fractionMatch = block.match(/class="[^"]*a-price-fraction[^"]*"[^>]*>(\d+)</);
      const price = priceMatch
        ? parseFloat(`${priceMatch[1]}.${fractionMatch?.[1] || '00'}`)
        : 0;

      if (!price) continue;

      // Extract image
      const imgMatch = block.match(/src="(https:\/\/m\.media-amazon\.com\/images\/[^"]+)"/);
      
      // Extract rating
      const ratingMatch = block.match(/(\d+\.\d+) out of 5/);
      const reviewMatch = block.match(/([\d,]+) ratings/);

      products.push({
        id: asin,
        asin,
        name,
        price,
        url: `${this.BASE_URL}/dp/${asin}?tag=${this.affiliateTag}`,
        image: imgMatch?.[1],
        rating: ratingMatch ? parseFloat(ratingMatch[1]) : undefined,
        reviewCount: reviewMatch ? parseInt(reviewMatch[1].replace(',', '')) : undefined,
        inStock: !block.includes('Currently unavailable'),
      });

      if (products.length >= 20) break;
    }

    return products.filter((p) => p.price > 0);
  }

  async getProduct(asin: string): Promise<ScrapedProduct | null> {
    try {
      const url = `${this.BASE_URL}/dp/${asin}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html',
        },
        timeout: 15000,
      });

      const html = response.data;

      // Extract product data
      const titleMatch = html.match(/id="productTitle"[^>]*>([^<]+)</);
      const priceMatch = html.match(/id="priceblock_ourprice"[^>]*>SAR\s*([\d,.]+)/);

      if (!titleMatch || !priceMatch) return null;

      return {
        id: asin,
        asin,
        name: titleMatch[1].trim(),
        price: parseFloat(priceMatch[1].replace(',', '')),
        url: `${this.BASE_URL}/dp/${asin}?tag=${this.affiliateTag}`,
        inStock: !html.includes('Currently unavailable'),
      };
    } catch (err: any) {
      this.logger.error(`Amazon getProduct failed for ${asin}: ${err.message}`);
      return null;
    }
  }
}
