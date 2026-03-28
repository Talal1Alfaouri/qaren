import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database.service';
import { CacheService } from '../../common/cache.service';

@Injectable()
export class AnalyticsService {
  constructor(private db: DatabaseService, private cache: CacheService) {}

  async getDashboardStats() {
    const [stats] = await this.db.sql`
      SELECT
        (SELECT COUNT(*) FROM products WHERE is_active = true) as total_products,
        (SELECT COUNT(*) FROM offers WHERE is_available = true) as total_offers,
        (SELECT COUNT(*) FROM stores WHERE is_active = true) as total_stores,
        (SELECT COUNT(*) FROM clicks WHERE clicked_at > NOW() - INTERVAL '24 hours') as clicks_24h,
        (SELECT COUNT(*) FROM clicks WHERE clicked_at > NOW() - INTERVAL '7 days') as clicks_7d,
        (SELECT COUNT(*) FROM clicks WHERE clicked_at > NOW() - INTERVAL '30 days') as clicks_30d,
        (SELECT COUNT(*) FROM scrape_jobs WHERE status = 'completed' AND created_at > NOW() - INTERVAL '24 hours') as scrapes_today
    `;

    const topProducts = await this.db.sql`
      SELECT p.id, p.slug, p.name_en, p.view_count, p.image_urls[1] as image
      FROM products p
      WHERE p.is_active = true
      ORDER BY p.view_count DESC
      LIMIT 10
    `;

    const topStores = await this.db.sql`
      SELECT s.id, s.slug, s.name_en, s.logo_url,
        COUNT(c.id) as click_count
      FROM stores s
      LEFT JOIN clicks c ON c.store_id = s.id
        AND c.clicked_at > NOW() - INTERVAL '30 days'
      GROUP BY s.id
      ORDER BY click_count DESC
    `;

    const recentScrapes = await this.db.sql`
      SELECT sj.*, s.name_en as store_name
      FROM scrape_jobs sj
      JOIN stores s ON s.id = sj.store_id
      ORDER BY sj.created_at DESC
      LIMIT 20
    `;

    return { stats, topProducts, topStores, recentScrapes };
  }

  async getClickTimeline(days = 30) {
    return this.db.sql`
      SELECT 
        DATE_TRUNC('day', clicked_at) as date,
        COUNT(*) as clicks,
        s.slug as store_slug,
        s.name_en as store_name
      FROM clicks c
      JOIN stores s ON s.id = c.store_id
      WHERE c.clicked_at > NOW() - INTERVAL '${this.db.sql.unsafe(days.toString())} days'
      GROUP BY DATE_TRUNC('day', clicked_at), s.id, s.slug, s.name_en
      ORDER BY date ASC
    `;
  }
}
