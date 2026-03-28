import { chromium, BrowserContext, Page } from 'playwright';

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

// Stealth headers to avoid bot detection
const STEALTH_HEADERS = {
  'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'sec-ch-ua': '"Chromium";v="121", "Not A(Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'Upgrade-Insecure-Requests': '1',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
};

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function randomDelay(min = 800, max = 2500) {
  return delay(min + Math.random() * (max - min));
}

export class NoonPlaywrightScraper {
  private context?: BrowserContext;

  async init() {
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });

    this.context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      locale: 'en-SA',
      timezoneId: 'Asia/Riyadh',
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders: STEALTH_HEADERS,
      geolocation: { latitude: 24.7136, longitude: 46.6753 }, // Riyadh
      permissions: ['geolocation'],
    });

    // Inject anti-detection scripts
    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en', 'ar'] });
      (window as any).chrome = { runtime: {} };
    });
  }

  async searchProducts(query: string): Promise<ScrapedProduct[]> {
    if (!this.context) await this.init();

    const page = await this.context!.newPage();
    const products: ScrapedProduct[] = [];

    try {
      const searchUrl = `https://www.noon.com/saudi-en/search/?q=${encodeURIComponent(query)}`;
      console.log(`[Noon] Searching: ${query}`);

      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await randomDelay(1500, 3000);

      // Wait for product grid
      await page.waitForSelector('[class*="productContainer"], [data-testid="product-grid"]', {
        timeout: 10000,
      }).catch(() => null);

      // Scroll to load lazy content
      await this.autoScroll(page);

      // Extract products
      const items = await page.evaluate(() => {
        const cards = document.querySelectorAll('[data-qa="product-block"], [class*="sc-bcXHqe"]');
        const results: any[] = [];

        cards.forEach((card) => {
          const nameEl = card.querySelector('[data-qa="product-name"], h3, [class*="name"]');
          const priceEl = card.querySelector('[class*="priceNow"], [data-qa="price-now"]');
          const wasPriceEl = card.querySelector('[class*="priceWas"], [data-qa="price-was"]');
          const imgEl = card.querySelector('img');
          const linkEl = card.querySelector('a');
          const ratingEl = card.querySelector('[class*="rating"], [class*="stars"]');
          const reviewEl = card.querySelector('[class*="reviewCount"], [class*="review-count"]');

          const name = nameEl?.textContent?.trim();
          const priceText = priceEl?.textContent?.replace(/[^\d.]/g, '');
          const price = priceText ? parseFloat(priceText) : 0;

          if (!name || !price) return;

          const wasText = wasPriceEl?.textContent?.replace(/[^\d.]/g, '');
          const wasPrice = wasText ? parseFloat(wasText) : 0;

          // Extract product ID from URL or data attributes
          const href = linkEl?.getAttribute('href') || '';
          const idMatch = href.match(/\/p\/([^/?]+)/);
          const id = idMatch?.[1] || card.getAttribute('data-product-id') || Math.random().toString(36).slice(2);

          results.push({
            id,
            name,
            price,
            originalPrice: wasPrice > price ? wasPrice : undefined,
            url: href.startsWith('http') ? href : `https://www.noon.com${href}`,
            image: imgEl?.src || imgEl?.getAttribute('data-src'),
            rating: parseFloat(ratingEl?.getAttribute('aria-label')?.match(/\d+\.?\d*/)?.[0] || '0') || undefined,
            reviewCount: parseInt(reviewEl?.textContent?.replace(/[^\d]/g, '') || '0') || undefined,
            inStock: !card.querySelector('[class*="outOfStock"], [class*="sold-out"]'),
          });
        });

        return results;
      });

      products.push(...items.filter((p) => p.price > 0));

      // Try to intercept XHR/fetch responses for structured data
      console.log(`[Noon] Found ${products.length} products for "${query}"`);

    } catch (err: any) {
      console.error(`[Noon] Error: ${err.message}`);
    } finally {
      await page.close();
    }

    return products;
  }

  private async autoScroll(page: Page) {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 400;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= Math.min(document.body.scrollHeight * 0.8, 6000)) {
            clearInterval(timer);
            resolve();
          }
        }, 150);
      });
    });
    await randomDelay(500, 1000);
    await page.evaluate(() => window.scrollTo(0, 0));
  }

  async close() {
    await this.context?.browser()?.close();
  }
}

// ─── Jarir Playwright Scraper ─────────────────────────────────────────────────
export class JarirPlaywrightScraper {
  private context?: BrowserContext;

  async init() {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    this.context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      locale: 'en-SA',
      viewport: { width: 1366, height: 768 },
    });

    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
  }

  async searchProducts(query: string): Promise<ScrapedProduct[]> {
    if (!this.context) await this.init();

    const page = await this.context!.newPage();
    const products: ScrapedProduct[] = [];

    try {
      const url = `https://www.jarir.com/catalogsearch/result/?q=${encodeURIComponent(query)}`;
      console.log(`[Jarir] Searching: ${query}`);

      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await randomDelay(1000, 2000);

      // Wait for product list
      await page.waitForSelector('.product-item, .product-list-item, [class*="product-card"]', {
        timeout: 10000,
      }).catch(() => null);

      const items = await page.evaluate(() => {
        const cards = document.querySelectorAll(
          '.product-item, .product-list-item, [class*="product-card"], .item.product',
        );
        const results: any[] = [];

        cards.forEach((card) => {
          const nameEl = card.querySelector('.product-item-name a, h2 a, .product-name a');
          const priceEl = card.querySelector('.price, [class*="price-final"], .special-price .price');
          const oldPriceEl = card.querySelector('.old-price .price, .regular-price');
          const imgEl = card.querySelector('img.product-image-photo, img[class*="product"]');

          const name = nameEl?.textContent?.trim();
          const priceText = priceEl?.textContent?.replace(/[^\d.]/g, '');
          const price = priceText ? parseFloat(priceText) : 0;

          if (!name || !price) return;

          const href = (nameEl as HTMLAnchorElement)?.href || '';
          const sku = card.getAttribute('data-sku') ||
                      card.getAttribute('data-product-sku') ||
                      href.split('/').pop()?.replace('.html', '') ||
                      Math.random().toString(36).slice(2);

          const oldPriceText = oldPriceEl?.textContent?.replace(/[^\d.]/g, '');
          const oldPrice = oldPriceText ? parseFloat(oldPriceText) : 0;

          results.push({
            id: sku,
            name,
            price,
            originalPrice: oldPrice > price ? oldPrice : undefined,
            url: href,
            image: imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src'),
            inStock: !card.querySelector('.out-of-stock, [class*="unavailable"]'),
          });
        });

        return results;
      });

      products.push(...items.filter((p) => p.price > 0));
      console.log(`[Jarir] Found ${products.length} products for "${query}"`);

    } catch (err: any) {
      console.error(`[Jarir] Error: ${err.message}`);
    } finally {
      await page.close();
    }

    return products;
  }

  async close() {
    await this.context?.browser()?.close();
  }
}
