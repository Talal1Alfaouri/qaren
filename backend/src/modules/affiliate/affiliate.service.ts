import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface AffiliateConfig {
  storeSlug: string;
  originalUrl: string;
  affiliateUrlTemplate?: string;
  affiliateId?: string;
  affiliateTag?: string;
  storePath?: string;
}

@Injectable()
export class AffiliateService {
  constructor(private config: ConfigService) {}

  buildAffiliateUrl(config: AffiliateConfig): string {
    const { storeSlug, originalUrl, affiliateUrlTemplate } = config;

    switch (storeSlug) {
      case 'amazon-sa': {
        const tag = this.config.get('AMAZON_AFFILIATE_TAG') || 'qaren-21';
        try {
          const url = new URL(originalUrl);
          url.searchParams.set('tag', tag);
          url.searchParams.set('linkCode', 'as2');
          url.searchParams.set('camp', '1789');
          return url.toString();
        } catch {
          return `${originalUrl}?tag=${tag}`;
        }
      }

      case 'noon': {
        const affiliateId = this.config.get('NOON_AFFILIATE_ID');
        if (affiliateId) {
          return `${originalUrl}?utm_source=qaren&utm_medium=affiliate&aid=${affiliateId}`;
        }
        // Fallback: tracking redirect
        return this.buildTrackingUrl(storeSlug, originalUrl);
      }

      case 'jarir':
      case 'extra':
      case 'al-manea':
      case 'alsaif':
      case 'saco': {
        // Use template if available, otherwise tracking redirect
        if (affiliateUrlTemplate) {
          try {
            const url = new URL(originalUrl);
            return affiliateUrlTemplate
              .replace('{url}', encodeURIComponent(originalUrl))
              .replace('{path}', url.pathname + url.search);
          } catch {
            return this.buildTrackingUrl(storeSlug, originalUrl);
          }
        }
        return this.buildTrackingUrl(storeSlug, originalUrl);
      }

      default:
        return this.buildTrackingUrl(storeSlug, originalUrl);
    }
  }

  // Tracking redirect URL - allows future monetization
  buildTrackingUrl(storeSlug: string, originalUrl: string): string {
    const siteUrl = this.config.get('NEXT_PUBLIC_SITE_URL', 'https://qaren.sa');
    const encoded = btoa(originalUrl);
    return `${siteUrl}/go/${storeSlug}?u=${encoded}`;
  }

  decodeTrackingUrl(encoded: string): string {
    try {
      return atob(encoded);
    } catch {
      return '';
    }
  }
}
