import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from '../../common/database.service';
import { CacheService } from '../../common/cache.service';

export interface CreateAlertDto {
  productId: string;
  targetPrice: number;
  email: string;
  storeSlug?: string;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private db: DatabaseService,
    private cache: CacheService,
  ) {}

  async createAlert(dto: CreateAlertDto): Promise<{ id: string }> {
    const [alert] = await this.db.sql`
      INSERT INTO price_alerts (product_id, target_price, email, store_slug, is_active)
      VALUES (${dto.productId}, ${dto.targetPrice}, ${dto.email}, ${dto.storeSlug || null}, true)
      RETURNING id
    `;
    return { id: alert.id };
  }

  async deleteAlert(id: string, email: string): Promise<void> {
    await this.db.sql`
      UPDATE price_alerts SET is_active = false
      WHERE id = ${id} AND email = ${email}
    `;
  }

  async getAlertsForEmail(email: string) {
    return this.db.sql`
      SELECT pa.*, p.name_en, p.slug, p.image_urls,
        MIN(o.price) as current_price
      FROM price_alerts pa
      JOIN products p ON p.id = pa.product_id
      LEFT JOIN offers o ON o.product_id = pa.product_id AND o.is_available = true
      WHERE pa.email = ${email} AND pa.is_active = true
      GROUP BY pa.id, p.name_en, p.slug, p.image_urls
      ORDER BY pa.created_at DESC
    `;
  }

  // Check alerts every hour
  @Cron('0 * * * *')
  async checkAlerts() {
    this.logger.log('Checking price alerts...');

    const triggeredAlerts = await this.db.sql`
      SELECT 
        pa.*,
        p.name_en as product_name,
        p.slug as product_slug,
        MIN(o.price) as current_price,
        s.name_en as store_name,
        o.affiliate_url,
        o.store_url
      FROM price_alerts pa
      JOIN products p ON p.id = pa.product_id
      JOIN offers o ON o.product_id = pa.product_id AND o.is_available = true
      JOIN stores s ON s.id = o.store_id
      WHERE pa.is_active = true
        AND o.price <= pa.target_price
        AND (pa.store_slug IS NULL OR s.slug = pa.store_slug)
        AND (pa.last_triggered_at IS NULL OR pa.last_triggered_at < NOW() - INTERVAL '24 hours')
      GROUP BY pa.id, p.name_en, p.slug, s.name_en, o.affiliate_url, o.store_url
    `;

    this.logger.log(`Found ${triggeredAlerts.length} triggered alerts`);

    for (const alert of triggeredAlerts) {
      try {
        await this.sendAlertEmail(alert);

        await this.db.sql`
          UPDATE price_alerts 
          SET last_triggered_at = NOW(), triggered_count = triggered_count + 1
          WHERE id = ${alert.id}
        `;
      } catch (err: any) {
        this.logger.error(`Failed to send alert ${alert.id}: ${err.message}`);
      }
    }
  }

  private async sendAlertEmail(alert: any) {
    // Integration point for email service (SendGrid, Resend, AWS SES, etc.)
    // For now, log the alert - plug in your email provider here
    this.logger.log(`
      📧 PRICE ALERT TRIGGERED
      To: ${alert.email}
      Product: ${alert.productName}
      Target: SAR ${alert.targetPrice}
      Current: SAR ${alert.currentPrice}
      Store: ${alert.storeName}
      Link: ${alert.affiliateUrl || alert.storeUrl}
    `);

    // Example with fetch to Resend API:
    // const RESEND_API_KEY = process.env.RESEND_API_KEY;
    // if (!RESEND_API_KEY) return;
    //
    // await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     from: 'alerts@qaren.sa',
    //     to: alert.email,
    //     subject: `🔔 Price Drop: ${alert.productName} is now SAR ${alert.currentPrice}`,
    //     html: buildAlertEmailHtml(alert),
    //   }),
    // });
  }
}

function buildAlertEmailHtml(alert: any): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://qaren.sa';
  const savings = alert.targetPrice - alert.currentPrice;
  return `
    <!DOCTYPE html>
    <html dir="ltr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Price Alert - Qaren</title>
    </head>
    <body style="font-family: system-ui, sans-serif; background: #f8fafc; margin: 0; padding: 20px;">
      <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 24px; text-align: center;">
          <div style="font-size: 28px; font-weight: 800; color: white; letter-spacing: -1px;">
            ⚡ Qaren | قارن
          </div>
          <div style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Price Alert Triggered</div>
        </div>

        <!-- Content -->
        <div style="padding: 28px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: #fef3c7; color: #d97706; font-size: 32px; padding: 12px; border-radius: 50%;">🔔</div>
          </div>

          <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; text-align: center; margin: 0 0 8px;">
            Price Drop Alert!
          </h2>
          <p style="color: #64748b; text-align: center; font-size: 14px; margin: 0 0 24px;">
            The price you've been waiting for is here.
          </p>

          <!-- Product card -->
          <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
            <div style="font-size: 15px; font-weight: 600; color: #1e293b; margin-bottom: 12px;">
              ${alert.productName}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 12px; color: #94a3b8;">Current price</div>
                <div style="font-size: 26px; font-weight: 800; color: #ea580c;">
                  SAR ${alert.currentPrice.toLocaleString()}
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 12px; color: #94a3b8;">Your target</div>
                <div style="font-size: 16px; font-weight: 600; color: #64748b; text-decoration: line-through;">
                  SAR ${alert.targetPrice.toLocaleString()}
                </div>
              </div>
            </div>
            ${savings > 0 ? `
            <div style="margin-top: 12px; background: #dcfce7; color: #16a34a; font-size: 13px; font-weight: 600; padding: 8px 12px; border-radius: 8px; text-align: center;">
              💰 You save SAR ${savings.toLocaleString()} below your target!
            </div>
            ` : ''}
            <div style="margin-top: 8px; font-size: 12px; color: #64748b;">At: ${alert.storeName}</div>
          </div>

          <!-- CTA -->
          <a href="${alert.affiliateUrl || alert.storeUrl}"
             style="display: block; background: #ea580c; color: white; text-decoration: none; text-align: center; padding: 14px; border-radius: 10px; font-weight: 700; font-size: 15px; margin-bottom: 16px;">
            Buy Now →
          </a>

          <a href="${siteUrl}/product/${alert.productSlug}"
             style="display: block; color: #64748b; text-decoration: none; text-align: center; padding: 10px; font-size: 13px;">
            Compare all prices on Qaren
          </a>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 16px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="font-size: 11px; color: #94a3b8; margin: 0;">
            You received this because you set a price alert on Qaren.
            <a href="${siteUrl}/alerts/unsubscribe?id=${alert.id}&email=${encodeURIComponent(alert.email)}"
               style="color: #94a3b8;">Unsubscribe</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
