const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}/api/v1${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    next: options?.next,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message || `API error ${res.status}`);
  }

  return res.json();
}

export interface Product {
  id: string;
  slug: string;
  nameEn: string;
  nameAr?: string;
  descriptionEn?: string;
  imageUrls: string[];
  specs: Record<string, string>;
  viewCount: number;
  categorySlug?: string;
  categoryNameEn?: string;
  categoryNameAr?: string;
  brandName?: string;
  minPrice?: number;
  maxPrice?: number;
  storeCount?: number;
  offers?: Offer[];
  discountPct?: number;
}

export interface Offer {
  id: string;
  storeSlug: string;
  storeNameEn: string;
  storeNameAr: string;
  storeLogo?: string;
  price: number;
  originalPrice?: number;
  affiliateUrl: string;
  storeUrl: string;
  isAvailable: boolean;
  rating?: number;
  reviewCount?: number;
  lastScrapedAt?: string;
}

export interface Category {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  icon?: string;
  productCount: number;
}

export interface SearchResult {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PricePoint {
  recordedAt: string;
  price: number;
  isAvailable: boolean;
  storeSlug: string;
  storeName: string;
}

// API functions
export const api = {
  search: (params: Record<string, string | number | undefined>): Promise<SearchResult> => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    }
    return apiFetch(`/products/search?${qs}`);
  },

  getProduct: (slug: string): Promise<Product> =>
    apiFetch(`/products/${slug}`, { next: { revalidate: 300 } }),

  getCategories: (): Promise<Category[]> =>
    apiFetch('/products/categories', { next: { revalidate: 3600 } }),

  getDeals: (limit?: number): Promise<Product[]> =>
    apiFetch(`/products/deals${limit ? `?limit=${limit}` : ''}`, { next: { revalidate: 600 } }),

  getPriceHistory: (productId: string, days?: number): Promise<PricePoint[]> =>
    apiFetch(`/products/${productId}/price-history${days ? `?days=${days}` : ''}`),

  trackClick: async (offerId: string): Promise<void> => {
    const sessionId = getOrCreateSessionId();
    await apiFetch(`/products/offers/${offerId}/click`, {
      method: 'POST',
      headers: { 'x-session-id': sessionId },
    });
  },

  getAdminStats: () => apiFetch('/admin/analytics/dashboard'),
  getScraperStatus: () => apiFetch('/admin/scraper/status'),
  triggerScrape: () => apiFetch('/admin/scraper/trigger', { method: 'POST' }),
};

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = sessionStorage.getItem('qaren-sid');
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('qaren-sid', sid);
  }
  return sid;
}
