-- Qaren Database Schema
-- Full production schema with indexes and constraints

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS "unaccent"; -- For Arabic/English search normalization

-- =====================
-- STORES
-- =====================
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  base_url VARCHAR(255) NOT NULL,
  affiliate_url_template TEXT, -- {url} placeholder for affiliate wrapping
  affiliate_id VARCHAR(100),
  logo_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  scrape_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- CATEGORIES
-- =====================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  parent_id UUID REFERENCES categories(id),
  icon VARCHAR(50),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- BRANDS
-- =====================
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  logo_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- PRODUCTS (Unified entities)
-- =====================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(300) UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT,
  description_en TEXT,
  description_ar TEXT,
  category_id UUID REFERENCES categories(id),
  brand_id UUID REFERENCES brands(id),
  image_urls TEXT[] DEFAULT '{}',
  specs JSONB DEFAULT '{}',
  embedding FLOAT[], -- For semantic matching (1536 dims)
  normalized_tokens TEXT[], -- For token matching
  view_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_name_en_trgm ON products USING gin(name_en gin_trgm_ops);
CREATE INDEX idx_products_name_ar_trgm ON products USING gin(name_ar gin_trgm_ops);
CREATE INDEX idx_products_view_count ON products(view_count DESC);

-- Full text search
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX idx_products_search ON products USING gin(search_vector);

CREATE OR REPLACE FUNCTION update_products_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('simple', COALESCE(NEW.name_en, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.name_ar, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.description_en, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_search_vector_update
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_products_search_vector();

-- =====================
-- OFFERS (Per-store prices)
-- =====================
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id),
  store_product_id VARCHAR(255), -- Store's internal ID
  store_url TEXT NOT NULL,
  affiliate_url TEXT, -- Processed affiliate link
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2), -- Before discount
  currency VARCHAR(10) DEFAULT 'SAR',
  is_available BOOLEAN DEFAULT true,
  is_sponsored BOOLEAN DEFAULT false,
  rating DECIMAL(3,2),
  review_count INT DEFAULT 0,
  store_image_url TEXT,
  last_scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, store_product_id)
);

CREATE INDEX idx_offers_product ON offers(product_id);
CREATE INDEX idx_offers_store ON offers(store_id);
CREATE INDEX idx_offers_price ON offers(price);
CREATE INDEX idx_offers_available ON offers(is_available);

-- =====================
-- PRICE HISTORY
-- =====================
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id),
  price DECIMAL(10,2) NOT NULL,
  is_available BOOLEAN DEFAULT true,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_history_offer ON price_history(offer_id);
CREATE INDEX idx_price_history_product ON price_history(product_id);
CREATE INDEX idx_price_history_recorded ON price_history(recorded_at DESC);

-- =====================
-- CLICKS (Affiliate tracking)
-- =====================
CREATE TABLE IF NOT EXISTS clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id),
  offer_id UUID REFERENCES offers(id),
  store_id UUID REFERENCES stores(id),
  session_id VARCHAR(100),
  ip_hash VARCHAR(64), -- Hashed for privacy
  user_agent TEXT,
  referrer TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clicks_product ON clicks(product_id);
CREATE INDEX idx_clicks_offer ON clicks(offer_id);
CREATE INDEX idx_clicks_store ON clicks(store_id);
CREATE INDEX idx_clicks_clicked_at ON clicks(clicked_at DESC);

-- =====================
-- SCRAPE JOBS
-- =====================
CREATE TABLE IF NOT EXISTS scrape_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id),
  status VARCHAR(20) DEFAULT 'pending', -- pending, running, completed, failed
  products_found INT DEFAULT 0,
  products_updated INT DEFAULT 0,
  errors JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- SEED DATA: STORES
-- =====================
INSERT INTO stores (slug, name_en, name_ar, base_url, affiliate_url_template, logo_url, scrape_config) VALUES
('noon', 'Noon', 'نون', 'https://www.noon.com/saudi-en', 
  'https://www.noon.com/saudi-en/?utm_source=qaren&utm_medium=affiliate&url={url}',
  '/logos/noon.svg',
  '{"search_url": "https://www.noon.com/saudi-en/search/?q={query}", "currency": "SAR"}'
),
('amazon-sa', 'Amazon Saudi Arabia', 'أمازون السعودية', 'https://www.amazon.sa',
  'https://www.amazon.sa{path}?tag={affiliate_tag}',
  '/logos/amazon.svg',
  '{"search_url": "https://www.amazon.sa/s?k={query}", "currency": "SAR", "affiliate_tag": "qaren-21"}'
),
('jarir', 'Jarir Bookstore', 'مكتبة جرير', 'https://www.jarir.com',
  'https://www.jarir.com{path}?utm_source=qaren',
  '/logos/jarir.svg',
  '{"search_url": "https://www.jarir.com/catalogsearch/result/?q={query}", "currency": "SAR"}'
),
('extra', 'Extra Stores', 'اكسترا', 'https://www.extra.com/en-sa',
  'https://www.extra.com/en-sa{path}?utm_source=qaren',
  '/logos/extra.svg',
  '{"search_url": "https://www.extra.com/en-sa/search?text={query}", "currency": "SAR"}'
),
('al-manea', 'Al Manea', 'المنيع', 'https://www.almanea.sa',
  'https://www.almanea.sa{path}?utm_source=qaren',
  '/logos/almanea.svg',
  '{"search_url": "https://www.almanea.sa/search?q={query}", "currency": "SAR"}'
),
('alsaif', 'Al-Saif Gallery', 'السيف غاليري', 'https://www.alsaifgallery.com',
  'https://www.alsaifgallery.com{path}?utm_source=qaren',
  '/logos/alsaif.svg',
  '{"search_url": "https://www.alsaifgallery.com/catalogsearch/result/?q={query}", "currency": "SAR"}'
),
('saco', 'Saco', 'ساكو', 'https://www.saco.sa',
  'https://www.saco.sa{path}?utm_source=qaren',
  '/logos/saco.svg',
  '{"search_url": "https://www.saco.sa/search?q={query}", "currency": "SAR"}'
)
ON CONFLICT (slug) DO NOTHING;

-- =====================
-- SEED DATA: CATEGORIES
-- =====================
INSERT INTO categories (slug, name_en, name_ar, icon, sort_order) VALUES
('mobiles', 'Mobile Phones', 'الجوالات', 'smartphone', 1),
('laptops', 'Laptops', 'اللابتوبات', 'laptop', 2),
('tvs', 'TVs & Screens', 'التلفزيونات', 'tv', 3),
('tablets', 'Tablets', 'الأجهزة اللوحية', 'tablet', 4),
('audio', 'Audio & Headphones', 'الصوتيات', 'headphones', 5),
('cameras', 'Cameras', 'الكاميرات', 'camera', 6),
('home-appliances', 'Home Appliances', 'الأجهزة المنزلية', 'home', 7),
('gaming', 'Gaming', 'الألعاب', 'gamepad-2', 8),
('wearables', 'Wearables', 'الأجهزة القابلة للارتداء', 'watch', 9),
('accessories', 'Accessories', 'الإكسسوارات', 'plug', 10)
ON CONFLICT (slug) DO NOTHING;

-- =====================
-- VIEWS FOR ANALYTICS
-- =====================
CREATE OR REPLACE VIEW product_best_prices AS
SELECT 
  p.id as product_id,
  p.name_en,
  p.name_ar,
  p.slug,
  MIN(o.price) as min_price,
  MAX(o.price) as max_price,
  COUNT(DISTINCT o.store_id) as store_count,
  ARRAY_AGG(DISTINCT s.slug) as store_slugs
FROM products p
JOIN offers o ON o.product_id = p.id AND o.is_available = true
JOIN stores s ON s.id = o.store_id
GROUP BY p.id, p.name_en, p.name_ar, p.slug;

CREATE OR REPLACE VIEW store_click_stats AS
SELECT 
  s.id as store_id,
  s.name_en,
  s.slug,
  COUNT(c.id) as total_clicks,
  COUNT(c.id) FILTER (WHERE c.clicked_at > NOW() - INTERVAL '7 days') as clicks_7d,
  COUNT(c.id) FILTER (WHERE c.clicked_at > NOW() - INTERVAL '30 days') as clicks_30d
FROM stores s
LEFT JOIN clicks c ON c.store_id = s.id
GROUP BY s.id, s.name_en, s.slug;
