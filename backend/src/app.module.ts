import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { DatabaseService } from './common/database.service';
import { CacheService } from './common/cache.service';
import { MatchingEngine } from './common/matching.engine';

import { AffiliateService } from './modules/affiliate/affiliate.service';
import { ProductsService } from './modules/products/products.service';
import { ProductsController } from './modules/products/products.controller';

import { NoonScraper } from './modules/scraper/scrapers/noon.scraper';
import { AmazonScraper } from './modules/scraper/scrapers/amazon.scraper';
import { JarirScraper, ExtraScraper } from './modules/scraper/scrapers/jarir.scraper';
import { ScraperService } from './modules/scraper/scraper.service';
import { ScraperController } from './modules/scraper/scraper.controller';

import { AnalyticsService } from './modules/analytics/analytics.service';
import { AnalyticsController } from './modules/analytics/analytics.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
  ],
  controllers: [
    ProductsController,
    ScraperController,
    AnalyticsController,
  ],
  providers: [
    // Common
    DatabaseService,
    CacheService,
    MatchingEngine,

    // Modules
    AffiliateService,
    ProductsService,
    AnalyticsService,

    // Scrapers
    NoonScraper,
    AmazonScraper,
    JarirScraper,
    ExtraScraper,
    ScraperService,
  ],
})
export class AppModule {}
