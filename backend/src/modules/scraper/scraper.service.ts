import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../../common/database.service';
import { CacheService } from '../../common/cache.service';
import { ProductsService } from '../products/products.service';
import { NoonScraper } from './scrapers/noon.scraper';
import { AmazonScraper } from './scrapers/amazon.scraper';
import { JarirScraper } from './scrapers/jarir.scraper';
import { ExtraScraper } from './scrapers/jarir.scraper';

interface ScrapeJob {
  storeSlug: string;
  query: string;
  categorySlug?: string;
  priority: number;
}

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private isRunning = false;
  private jobQueue: ScrapeJob[] = [];

  private readonly scrapers: Record<string, any> = {};

  constructor(
    private db: DatabaseService,
    private cache: CacheService,
    private products: ProductsService,
    private noon: NoonScraper,
    private amazon: AmazonScraper,
    private jarir: JarirScraper,
    private extra: ExtraScraper,
  ) {
    this.scrapers = {
      noon: this.noon,
      'amazon-sa': this.amazon,
      jarir: this.jarir,
      extra: this.extra,
    };
  }

  // Run every 4 hours
  @Cron('0 */4 * * *')
  async scheduledScrape() {
    this.logger.log('🕐 Scheduled scrape starting...');
    await this.runFullScrape();
  }

  async runFullScrape() {
    if (this.isRunning) {
      this.logger.warn('Scrape already running, skipping');
      return;
    }

    this.isRunning = true;

    const queries = [
      // Mobiles
      { q: 'iPhone 15', cat: 'mobiles' },
      { q: 'Samsung Galaxy S24', cat: 'mobiles' },
      { q: 'Google Pixel', cat: 'mobiles' },
      { q: 'Xiaomi 14', cat: 'mobiles' },
      // Laptops
      { q: 'MacBook Pro', cat: 'laptops' },
      { q: 'Dell XPS', cat: 'laptops' },
      { q: 'HP laptop', cat: 'laptops' },
      { q: 'Lenovo ThinkPad', cat: 'laptops' },
      // TVs
      { q: 'Samsung TV 55 inch 4K', cat: 'tvs' },
      { q: 'LG OLED TV', cat: 'tvs' },
      { q: 'Sony Bravia', cat: 'tvs' },
      // Home appliances
      { q: 'Samsung refrigerator', cat: 'home-appliances' },
      { q: 'Dyson vacuum', cat: 'home-appliances' },
      // Audio
      { q: 'AirPods Pro', cat: 'audio' },
      { q: 'Sony WH-1000XM5', cat: 'audio' },
    ];

    const stores = Object.keys(this.scrapers);

    for (const { q, cat } of queries) {
      for (const storeSlug of stores) {
        this.jobQueue.push({
          storeSlug,
          query: q,
          categorySlug: cat,
          priority: 1,
        });
      }
    }

    await this.processQueue();
    this.isRunning = false;
    this.logger.log('✅ Full scrape completed');
  }

  private async processQueue(concurrency = 2) {
    const running: Promise<void>[] = [];

    while (this.jobQueue.length > 0 || running.length > 0) {
      while (running.length < concurrency && this.jobQueue.length > 0) {
        const job = this.jobQueue.shift()!;
        const p = this.runJob(job).then(() => {
          running.splice(running.indexOf(p), 1);
        });
        running.push(p);
      }

      if (running.length > 0) {
        await Promise.race(running);
      }
    }
  }

  private async runJob(job: ScrapeJob, retries = 3): Promise<void> {
    const scraper = this.scrapers[job.storeSlug];
    if (!scraper) return;

    const [dbJob] = await this.db.sql`
      INSERT INTO scrape_jobs (store_id, status)
      SELECT id, 'running' FROM stores WHERE slug = ${job.storeSlug}
      RETURNING id
    `;

    try {
      this.logger.log(`Scraping ${job.storeSlug}: "${job.query}"`);
      
      const products = await scraper.search(job.query);
      let updated = 0;

      for (const product of products) {
        try {
          await this.products.upsertOffer({
            storeSlug: job.storeSlug,
            storeProductId: product.id,
            storeUrl: product.url,
            productName: product.name,
            price: product.price,
            originalPrice: product.originalPrice,
            imageUrl: product.image,
            rating: product.rating,
            reviewCount: product.reviewCount,
            isAvailable: product.inStock,
            categorySlug: job.categorySlug,
          });
          updated++;
        } catch (err) {
          this.logger.error(`Failed to upsert product: ${product.name}`, err);
        }
      }

      await this.db.sql`
        UPDATE scrape_jobs SET 
          status = 'completed',
          products_found = ${products.length},
          products_updated = ${updated},
          completed_at = NOW()
        WHERE id = ${dbJob.id}
      `;

      // Rate limiting between requests
      await this.sleep(2000 + Math.random() * 3000);

    } catch (err) {
      this.logger.error(`Scrape failed: ${job.storeSlug} "${job.query}"`, err);

      await this.db.sql`
        UPDATE scrape_jobs SET 
          status = 'failed',
          errors = ${JSON.stringify([{ message: err.message, stack: err.stack }])},
          completed_at = NOW()
        WHERE id = ${dbJob.id}
      `;

      if (retries > 0) {
        await this.sleep(5000 * (4 - retries));
        return this.runJob(job, retries - 1);
      }
    }
  }

  async getStatus() {
    const recentJobs = await this.db.sql`
      SELECT sj.*, s.name_en as store_name, s.slug as store_slug
      FROM scrape_jobs sj
      JOIN stores s ON s.id = sj.store_id
      ORDER BY sj.created_at DESC
      LIMIT 50
    `;

    return {
      isRunning: this.isRunning,
      queueLength: this.jobQueue.length,
      recentJobs,
    };
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
