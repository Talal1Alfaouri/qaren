# Qaren | قارن
### AI-Powered Price Comparison Platform for Saudi Arabia

> Compare electronics & home appliances across Noon, Amazon.sa, Jarir, Extra, Al-Manea, Al-Saif Gallery, and SACO — automatically.

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│   Next.js 14 (App Router) · TailwindCSS · Arabic RTL      │
│   Server Components · ISR · Schema.org SEO                 │
└─────────────────────────┬───────────────────────────────────┘
                          │ REST API
┌─────────────────────────▼───────────────────────────────────┐
│                        BACKEND                              │
│   NestJS · Modular · Swagger Docs                           │
│   AI Matching Engine · Affiliate Link Builder              │
└────────────┬──────────────────────────────┬─────────────────┘
             │                              │
┌────────────▼──────────┐    ┌─────────────▼─────────────────┐
│     PostgreSQL 16      │    │          Redis 7               │
│  products · offers     │    │   Cache · Rate limiting        │
│  price_history · clicks│    │   Real-time click counters     │
└───────────────────────┘    └───────────────────────────────┘
             ▲
┌────────────┴──────────────────────────────────────────────┐
│                     SCRAPER SERVICE                        │
│   Playwright (anti-block) · Axios fallback                 │
│   Noon · Amazon.sa · Jarir · Extra · 3 more               │
│   Cron: every 4 hours · Retry 3x · Queue system           │
└───────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Git

### 1. Clone and setup
```bash
git clone https://github.com/yourname/qaren.git
cd qaren
cp .env.example .env
# Edit .env with your values
```

### 2. Start everything with Docker
```bash
docker-compose up -d
```

That's it. Services start at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Swagger Docs**: http://localhost:3001/api/docs
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### 3. Run first scrape
```bash
# Via API
curl -X POST http://localhost:3001/api/v1/admin/scraper/trigger

# Or directly
cd scrapers && npm install && npm run scrape:all
```

### 4. Run without Docker (development)
```bash
# Terminal 1: Database
docker-compose up postgres redis -d

# Terminal 2: Backend
cd backend && npm install && npm run dev

# Terminal 3: Frontend
cd frontend && npm install && npm run dev

# Terminal 4: Scrapers (optional)
cd scrapers && npm install && npm run install:browsers && npm run scrape
```

---

## 💰 Monetization Setup

### Amazon SA Affiliate (Highest Priority)
1. Go to [associates.amazon.sa](https://associates.amazon.sa)
2. Sign up and get your affiliate tag (format: `yourname-21`)
3. Set in `.env`: `AMAZON_AFFILIATE_TAG=yourname-21`
4. ✅ All Amazon links automatically include your tag

### Noon Partners Program
1. Apply at [partners.noon.com](https://partners.noon.com)
2. Get your affiliate ID
3. Set in `.env`: `NOON_AFFILIATE_ID=your-id`
4. ✅ All Noon links include your affiliate ID

### Other Stores (Tracking Redirects)
All other stores (Jarir, Extra, Al-Manea, SACO, Al-Saif) automatically use tracking redirects:
```
https://qaren.sa/go/jarir?u=BASE64_ENCODED_URL
```

When you join their affiliate programs later:
1. Update `affiliate_url_template` in the `stores` table
2. All existing clicks will route through the new affiliate link
3. No code changes needed

### Click Tracking
Every affiliate click is logged in the `clicks` table:
- `product_id`, `offer_id`, `store_id`
- `session_id`, `ip_hash` (privacy-safe)
- `clicked_at` timestamp
- Ready for future conversion tracking via store APIs

---

## 🤖 AI Matching Engine

The matching engine in `backend/src/common/matching.engine.ts` uses three-layer scoring:

### Layer 1: Attribute Extraction
Extracts brand, model number, screen size, storage, resolution from product names.
**Hard blocks**: Different brands or conflicting attributes = score 0.

### Layer 2: Token Jaccard Similarity (50% weight)
Tokenizes names, removes stop words, computes set intersection/union.

### Layer 3: Levenshtein Distance (20% weight) + Attribute Score (30% weight)
Normalized edit distance + weighted attribute match.

**Threshold**: 0.72 (configurable). Above threshold → same product. Below → new product.

**Example matches:**
```
"LG 55 inch Smart TV 4K UHD"          ↔  "LG UHD Smart Television 55'' 4K"       → 0.84 ✅ MATCH
"Samsung Galaxy S24 Ultra 256GB"       ↔  "SAMSUNG S24 Ultra 256 GB Smartphone"   → 0.81 ✅ MATCH
"Apple iPhone 15 Pro 128GB Blue"       ↔  "iPhone 15 Pro Max 256GB"               → 0.61 ✗  DIFFERENT
"Sony WH-1000XM5 Headphones Black"     ↔  "Sony WH1000XM5 Wireless Headphone"     → 0.79 ✅ MATCH
```

---

## 🌐 Deployment

### Option A: 1-Click Docker (VPS/Cloud)
```bash
# On your server (Ubuntu 22.04+)
git clone https://github.com/yourname/qaren.git && cd qaren
cp .env.example .env && nano .env  # Fill in values
docker-compose up -d
```

Add nginx reverse proxy:
```nginx
server {
    server_name qaren.sa www.qaren.sa;
    location / { proxy_pass http://localhost:3000; }
    location /api { proxy_pass http://localhost:3001; }
}
```

### Option B: Managed Cloud (Recommended)

**Frontend → Vercel (Free)**
```bash
cd frontend
npx vercel --prod
# Set env vars in Vercel dashboard
```

**Backend → Railway**
```bash
cd backend
railway login && railway up
# Set DATABASE_URL, REDIS_URL, etc.
```

**Database → Supabase (Free tier)**
1. Create project at supabase.com
2. Run `docker/init.sql` in Supabase SQL editor
3. Copy connection string to `DATABASE_URL`

**Redis → Upstash (Free tier)**
1. Create database at upstash.com
2. Copy connection string to `REDIS_URL`

**Scrapers → Railway (separate service)**
```bash
cd scrapers && railway up
```

### Option C: Full AWS/GCP
Use the Docker images with ECS/GKE. All services are containerized.

---

## 📊 Database Schema

```sql
stores          → 7 Saudi stores with affiliate config
categories      → 10 product categories
brands          → Auto-created from scraped data
products        → Unified product entities (cross-store matched)
offers          → Per-store price listings
price_history   → Full price change log
clicks          → Affiliate click tracking
scrape_jobs     → Scraper run logs
```

Key views:
- `product_best_prices` — Precomputed min/max per product
- `store_click_stats` — Click counts per store

---

## 🔍 API Reference

Full Swagger docs at `/api/docs`

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/products/search?q=iphone&category=mobiles&sort=price_asc` | Search with filters |
| `GET /api/v1/products/categories` | All categories with counts |
| `GET /api/v1/products/deals` | Best discounts |
| `GET /api/v1/products/:slug` | Product detail with all offers |
| `GET /api/v1/products/:id/price-history` | Price history chart data |
| `POST /api/v1/products/offers/:id/click` | Track affiliate click |
| `GET /api/v1/admin/analytics/dashboard` | Admin stats |
| `GET /api/v1/admin/scraper/status` | Scraper status |
| `POST /api/v1/admin/scraper/trigger` | Manual scrape trigger |

---

## 🗂 Folder Structure

```
qaren/
├── docker-compose.yml
├── docker/
│   └── init.sql               ← Full DB schema + seed data
├── .env.example
├── backend/
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── common/
│   │   │   ├── database.service.ts
│   │   │   ├── cache.service.ts
│   │   │   └── matching.engine.ts  ← AI matching
│   │   └── modules/
│   │       ├── products/           ← Search, CRUD, click tracking
│   │       ├── affiliate/          ← Link builder
│   │       ├── scraper/            ← Scheduler + scrapers
│   │       └── analytics/          ← Dashboard stats
│   └── Dockerfile
├── frontend/
│   ├── app/
│   │   ├── layout.tsx             ← Root layout + SEO
│   │   ├── page.tsx               ← Home (SSR)
│   │   ├── HomeClient.tsx         ← Hero, categories, deals
│   │   ├── search/                ← Search page
│   │   ├── product/[slug]/        ← Product detail + JSON-LD
│   │   ├── admin/                 ← Admin dashboard
│   │   └── go/[store]/            ← Affiliate redirect handler
│   ├── components/
│   │   ├── layout/                ← Header (bilingual), Footer
│   │   ├── product/               ← Cards, offer rows, price chart
│   │   └── search/                ← Filter sidebar
│   ├── lib/api.ts                 ← Typed API client
│   └── Dockerfile
└── scrapers/
    ├── src/
    │   ├── playwright-scrapers.ts ← Noon + Jarir Playwright scrapers
    │   └── index.ts               ← CLI entry + DB writer
    ├── entrypoint.sh              ← Cron scheduler
    └── Dockerfile                 ← Includes Playwright browsers
```

---

## 📈 SEO Features

- **Dynamic metadata** per product page (title, description, OG tags)
- **JSON-LD structured data** (Product + AggregateOffer schema)
- **Sitemap** auto-generated from product slugs
- **ISR** (Incremental Static Regeneration) for product pages
- **Bilingual** — separate metadata for Arabic/English
- **Core Web Vitals** optimized — SSR, image optimization, lazy loading

---

## 🧪 Testing

```bash
# Backend unit tests
cd backend && npm test

# API integration test
curl http://localhost:3001/api/v1/products/search?q=iphone | jq .

# Scraper test (dry run)
cd scrapers && npm run scrape:noon 2>&1 | head -50

# Test affiliate link generation
curl -X POST http://localhost:3001/api/v1/products/offers/OFFER_ID/click
```

---

## 🔧 Configuration Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `REDIS_URL` | Redis connection string | ✅ |
| `AMAZON_AFFILIATE_TAG` | Amazon Associates tag | 💰 Revenue |
| `NOON_AFFILIATE_ID` | Noon Partners ID | 💰 Revenue |
| `SCRAPE_INTERVAL_HOURS` | Hours between scrapes (default: 4) | Optional |
| `JWT_SECRET` | Admin auth secret (32+ chars) | ✅ |
| `NEXT_PUBLIC_API_URL` | Backend URL for frontend | ✅ |
| `OPENAI_API_KEY` | For embedding-based matching (optional) | Optional |

---

## 🚫 Legal Notes

- Scraping is done with polite delays (2-5 seconds between requests)
- User-agent identifies as Qaren bot
- Complies with robots.txt rate limits
- All affiliate disclosures shown in footer
- Price data cached to avoid excessive requests
- GDPR-friendly: IPs are hashed, not stored raw

---

## 🗺 Roadmap

- [ ] Price alerts via email/WhatsApp
- [ ] User accounts & wishlists
- [ ] Mobile app (React Native)
- [ ] More stores: Sharafdg, Lulu, Carrefour
- [ ] OpenAI embeddings for semantic matching
- [ ] Browser extension
- [ ] Telegram bot for deal alerts

---

Built for Saudi Arabia 🇸🇦 · Made with ❤️
