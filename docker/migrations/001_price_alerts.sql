-- Price Alerts table (add to init.sql or run as migration)
CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  target_price DECIMAL(10,2) NOT NULL,
  store_slug VARCHAR(50), -- NULL = any store
  is_active BOOLEAN DEFAULT true,
  triggered_count INT DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_alerts_product ON price_alerts(product_id);
CREATE INDEX idx_price_alerts_email ON price_alerts(email);
CREATE INDEX idx_price_alerts_active ON price_alerts(is_active) WHERE is_active = true;
