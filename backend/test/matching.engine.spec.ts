import { MatchingEngine } from '../src/common/matching.engine';

describe('MatchingEngine', () => {
  let engine: MatchingEngine;

  beforeEach(() => {
    engine = new MatchingEngine();
  });

  // ─── normalize ─────────────────────────────────────────────────────────────
  describe('normalize', () => {
    it('lowercases and strips punctuation', () => {
      expect(engine.normalize('iPhone 15 Pro!')).toBe('iphone 15 pro');
    });

    it('preserves Arabic characters', () => {
      const result = engine.normalize('آيفون 15 برو');
      expect(result).toContain('آيفون');
    });

    it('collapses whitespace', () => {
      expect(engine.normalize('  LG   TV  ')).toBe('lg tv');
    });
  });

  // ─── tokenize ──────────────────────────────────────────────────────────────
  describe('tokenize', () => {
    it('removes stop words', () => {
      const tokens = engine.tokenize('the best smart TV in the world');
      expect(tokens).not.toContain('the');
      expect(tokens).not.toContain('in');
      expect(tokens).not.toContain('smart');
      expect(tokens).toContain('tv');
    });

    it('handles model numbers', () => {
      const tokens = engine.tokenize('Samsung Galaxy S24 Ultra');
      expect(tokens).toContain('samsung');
      expect(tokens).toContain('galaxy');
      expect(tokens).toContain('s24');
      expect(tokens).toContain('ultra');
    });
  });

  // ─── extractAttributes ─────────────────────────────────────────────────────
  describe('extractAttributes', () => {
    it('extracts screen size', () => {
      const attrs = engine.extractAttributes('LG 55 inch OLED TV');
      expect(attrs.size).toBe('55');
    });

    it('extracts storage', () => {
      const attrs = engine.extractAttributes('Samsung Galaxy S24 256GB');
      expect(attrs.storage).toBe('256gb');
    });

    it('extracts brand', () => {
      const attrs = engine.extractAttributes('Apple MacBook Pro M3');
      expect(attrs.brand).toBe('apple');
    });

    it('extracts resolution', () => {
      const attrs = engine.extractAttributes('Sony Bravia 65" 4K OLED');
      expect(attrs.resolution).toBe('4k');
    });
  });

  // ─── computeMatchScore ─────────────────────────────────────────────────────
  describe('computeMatchScore', () => {
    it('gives high score for same product different wording', () => {
      const { score } = engine.computeMatchScore(
        'LG 55 inch Smart TV 4K UHD',
        'LG UHD Smart Television 55\'\' 4K',
      );
      expect(score).toBeGreaterThanOrEqual(0.72);
    });

    it('gives score 0 for different brands', () => {
      const { score, method } = engine.computeMatchScore(
        'Samsung Galaxy S24 Ultra',
        'Apple iPhone 15 Pro',
      );
      expect(score).toBe(0);
      expect(method).toBe('brand_mismatch');
    });

    it('gives score 0 for different screen sizes', () => {
      const { score } = engine.computeMatchScore(
        'Samsung QLED 55 inch TV',
        'Samsung QLED 65 inch TV',
      );
      expect(score).toBe(0);
    });

    it('matches same model with different capitalization', () => {
      const { score } = engine.computeMatchScore(
        'Sony WH-1000XM5 Headphones Black',
        'Sony WH1000XM5 Wireless Headphone',
      );
      expect(score).toBeGreaterThanOrEqual(0.65);
    });

    it('does not match different iPhone models', () => {
      const { score } = engine.computeMatchScore(
        'Apple iPhone 15 Pro 128GB',
        'Apple iPhone 15 Pro Max 256GB',
      );
      // Different storage and model variant — should not reach 0.72
      expect(score).toBeLessThan(0.72);
    });
  });

  // ─── findBestMatch ─────────────────────────────────────────────────────────
  describe('findBestMatch', () => {
    const candidates = [
      { id: '1', nameEn: 'Samsung Galaxy S24 Ultra 256GB Black', nameAr: 'سامسونج جالاكسي S24 الترا' },
      { id: '2', nameEn: 'Apple iPhone 15 Pro 128GB Natural Titanium', nameAr: 'آيفون 15 برو' },
      { id: '3', nameEn: 'LG OLED55C3PSA 55 inch OLED 4K TV', nameAr: '' },
    ];

    it('finds correct match', () => {
      const { match, score } = engine.findBestMatch(
        { name: 'Samsung S24 Ultra 256 GB Smartphone', brand: 'samsung' },
        candidates,
      );
      expect(match?.id).toBe('1');
      expect(score).toBeGreaterThanOrEqual(0.72);
    });

    it('returns null for no match', () => {
      const { match } = engine.findBestMatch(
        { name: 'Dyson V15 Detect Vacuum Cleaner', brand: 'dyson' },
        candidates,
      );
      expect(match).toBeNull();
    });
  });

  // ─── generateSlug ──────────────────────────────────────────────────────────
  describe('generateSlug', () => {
    it('generates valid slugs', () => {
      const slug = engine.generateSlug('Samsung Galaxy S24 Ultra (256GB) - Black');
      expect(slug).toMatch(/^[a-z0-9-]+$/);
      expect(slug).not.toContain('(');
      expect(slug).not.toContain(')');
    });

    it('truncates long names', () => {
      const longName = 'A'.repeat(300);
      expect(engine.generateSlug(longName).length).toBeLessThanOrEqual(250);
    });
  });
});

// ─── Affiliate Service Tests ───────────────────────────────────────────────────
describe('AffiliateService URL building', () => {
  it('adds Amazon affiliate tag to product URL', () => {
    const originalUrl = 'https://www.amazon.sa/dp/B0CHX1W1XY';
    const url = new URL(originalUrl);
    url.searchParams.set('tag', 'qaren-21');
    expect(url.toString()).toContain('tag=qaren-21');
  });

  it('builds tracking redirect for unknown stores', () => {
    const originalUrl = 'https://www.saco.sa/products/drill';
    const encoded = Buffer.from(originalUrl).toString('base64url');
    const trackingUrl = `https://qaren.sa/go/saco?u=${encoded}`;
    const decoded = Buffer.from(encoded, 'base64url').toString('utf-8');
    expect(decoded).toBe(originalUrl);
  });
});
