'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, Plus, ChevronDown, ChevronUp, Star, ExternalLink, ArrowLeft } from 'lucide-react';
import { useApp } from '@/app/providers';
import { api, Product } from '@/lib/api';
import clsx from 'clsx';

const MAX_COMPARE = 4;

export default function ComparePage() {
  const { lang, t, formatPrice, dir } = useApp();
  const [productSlugs, setProductSlugs] = useState<string[]>([]);
  const [products, setProducts] = useState<(Product | null)[]>([]);
  const [loading, setLoading] = useState<boolean[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [expandedSpecs, setExpandedSpecs] = useState(true);

  // Load from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slugs = params.getAll('p').slice(0, MAX_COMPARE);
    if (slugs.length) {
      setProductSlugs(slugs);
      loadProducts(slugs);
    }
  }, []);

  async function loadProducts(slugs: string[]) {
    setLoading(Array(slugs.length).fill(true));
    const results = await Promise.all(
      slugs.map((slug) => api.getProduct(slug).catch(() => null))
    );
    setProducts(results);
    setLoading(Array(slugs.length).fill(false));
  }

  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await api.search({ q, limit: 6 });
      setSearchResults(res.products.filter(
        (p) => !productSlugs.includes(p.slug)
      ));
    } catch { setSearchResults([]); }
    setSearching(false);
  }

  function addProduct(product: Product) {
    if (productSlugs.length >= MAX_COMPARE) return;
    const newSlugs = [...productSlugs, product.slug];
    setProductSlugs(newSlugs);
    setProducts([...products, product]);
    setSearchQuery('');
    setSearchResults([]);
    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.append('p', product.slug);
    window.history.replaceState({}, '', url.toString());
  }

  function removeProduct(index: number) {
    const newSlugs = productSlugs.filter((_, i) => i !== index);
    const newProducts = products.filter((_, i) => i !== index);
    setProductSlugs(newSlugs);
    setProducts(newProducts);
    const url = new URL(window.location.href);
    url.searchParams.delete('p');
    newSlugs.forEach((s) => url.searchParams.append('p', s));
    window.history.replaceState({}, '', url.toString());
  }

  // Collect all unique spec keys across products
  const allSpecKeys = [...new Set(
    products.flatMap((p) => p ? Object.keys(p.specs || {}) : [])
  )];

  // Find cheapest price across compared products
  const cheapestIndex = products.reduce((cheapIdx, p, i) => {
    if (!p || !p.minPrice) return cheapIdx;
    const currentMin = products[cheapIdx]?.minPrice ?? Infinity;
    return p.minPrice < currentMin ? i : cheapIdx;
  }, 0);

  return (
    <div dir={dir} className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/search" className="btn-ghost text-sm mb-4 inline-flex">
          <ArrowLeft className={clsx('w-4 h-4', dir === 'rtl' && 'rotate-180')} />
          {t('Back to Search', 'العودة للبحث')}
        </Link>
        <h1 className="text-2xl font-display font-bold text-slate-900">
          {t('Compare Products', 'مقارنة المنتجات')}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {t(
            `Compare up to ${MAX_COMPARE} products side by side`,
            `قارن حتى ${MAX_COMPARE} منتجات جنباً إلى جنب`,
          )}
        </p>
      </div>

      {/* Add product search */}
      {productSlugs.length < MAX_COMPARE && (
        <div className="card p-4 mb-6">
          <div className="relative">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={t('Search to add a product...', 'ابحث لإضافة منتج...')}
              className="input-base"
            />
            {searching && (
              <div className="absolute end-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {searchResults.length > 0 && (
              <div className="absolute top-full start-0 end-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-card-hover z-20 overflow-hidden">
                {searchResults.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addProduct(product)}
                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-slate-50 transition-colors text-start"
                  >
                    {product.imageUrls?.[0] && (
                      <Image
                        src={product.imageUrls[0]}
                        alt={product.nameEn}
                        width={36}
                        height={36}
                        className="rounded-lg object-contain bg-slate-50"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {lang === 'ar' && product.nameAr ? product.nameAr : product.nameEn}
                      </p>
                      {product.minPrice && (
                        <p className="text-xs text-brand-600 font-semibold">{formatPrice(product.minPrice)}</p>
                      )}
                    </div>
                    <Plus className="w-4 h-4 text-brand-500 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {products.length === 0 ? (
        /* Empty state */
        <div className="text-center py-20">
          <div className="text-6xl mb-4">⚖️</div>
          <h2 className="text-xl font-bold text-slate-700 mb-2">
            {t('No products to compare', 'لا توجد منتجات للمقارنة')}
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            {t('Search above to add products', 'ابحث أعلاه لإضافة منتجات')}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-[640px] px-4 sm:px-0">
            {/* ─── Product Headers ─── */}
            <div
              className="grid gap-3 mb-6"
              style={{ gridTemplateColumns: `200px repeat(${products.length}, 1fr)` }}
            >
              <div /> {/* Label column spacer */}
              {products.map((product, i) => (
                <div
                  key={productSlugs[i]}
                  className={clsx(
                    'card p-4 relative',
                    i === cheapestIndex && products.length > 1 && 'ring-2 ring-brand-400 border-brand-200',
                  )}
                >
                  {i === cheapestIndex && products.length > 1 && (
                    <div className="absolute -top-3 start-1/2 -translate-x-1/2 bg-brand-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                      {t('Best Price', 'أفضل سعر')}
                    </div>
                  )}

                  {/* Remove button */}
                  <button
                    onClick={() => removeProduct(i)}
                    className="absolute top-2 end-2 w-6 h-6 bg-slate-100 hover:bg-red-100 hover:text-red-500 rounded-full flex items-center justify-center transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>

                  {/* Image */}
                  <div className="aspect-square bg-slate-50 rounded-xl mb-3 relative overflow-hidden">
                    {product?.imageUrls?.[0] ? (
                      <Image
                        src={product.imageUrls[0]}
                        alt={product.nameEn}
                        fill
                        className="object-contain p-3"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-200 text-3xl">📦</div>
                    )}
                  </div>

                  {/* Name */}
                  <Link
                    href={`/product/${productSlugs[i]}`}
                    className="text-sm font-semibold text-slate-800 hover:text-brand-600 line-clamp-2 mb-1 transition-colors"
                  >
                    {product ? (lang === 'ar' && product.nameAr ? product.nameAr : product.nameEn) : '...'}
                  </Link>

                  {product?.brandName && (
                    <p className="text-[10px] uppercase tracking-widest text-brand-500 font-bold mb-2">{product.brandName}</p>
                  )}

                  {/* Price */}
                  <div className="price-tag text-xl mb-3">
                    {product?.minPrice ? formatPrice(product.minPrice) : '—'}
                  </div>

                  {/* Best offer CTA */}
                  {product?.offers?.[0] && (
                    <a
                      href={product.offers[0].affiliateUrl || product.offers[0].storeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={clsx(
                        'flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-semibold transition-all',
                        i === cheapestIndex && products.length > 1
                          ? 'bg-brand-500 hover:bg-brand-600 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700',
                      )}
                      onClick={() => api.trackClick(product.offers![0].id).catch(() => {})}
                    >
                      <ExternalLink className="w-3 h-3" />
                      {lang === 'ar' ? product.offers[0].storeNameAr : product.offers[0].storeNameEn}
                    </a>
                  )}
                </div>
              ))}
            </div>

            {/* ─── Price Comparison Row ─── */}
            <CompareRow
              label={t('Stores Available', 'المتاجر المتاحة')}
              values={products.map((p) =>
                p?.offers?.filter((o) => o.isAvailable).length
                  ? `${p.offers!.filter((o) => o.isAvailable).length} ${t('stores', 'متاجر')}`
                  : '—'
              )}
              highlight={products.map((_, i) => i === cheapestIndex && products.length > 1)}
            />

            <CompareRow
              label={t('Lowest Price', 'أقل سعر')}
              values={products.map((p) => p?.minPrice ? formatPrice(p.minPrice) : '—')}
              highlight={products.map((_, i) => i === cheapestIndex && products.length > 1)}
              isPrice
            />

            <CompareRow
              label={t('Highest Price', 'أعلى سعر')}
              values={products.map((p) => p?.maxPrice ? formatPrice(p.maxPrice) : '—')}
            />

            {/* ─── Ratings ─── */}
            <CompareRow
              label={t('Rating', 'التقييم')}
              values={products.map((p) => {
                const avg = p?.offers?.filter((o) => o.rating).reduce(
                  (s, o, _, a) => s + (o.rating! / a.length), 0
                ) || 0;
                return avg > 0 ? (
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{avg.toFixed(1)}</span>
                  </div>
                ) : '—';
              })}
            />

            {/* ─── Specs Section ─── */}
            {allSpecKeys.length > 0 && (
              <>
                {/* Specs header */}
                <div
                  className="grid gap-3 mt-4 cursor-pointer"
                  style={{ gridTemplateColumns: `200px repeat(${products.length}, 1fr)` }}
                  onClick={() => setExpandedSpecs(!expandedSpecs)}
                >
                  <div className="flex items-center gap-2 py-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {t('Specifications', 'المواصفات')}
                    </span>
                    {expandedSpecs
                      ? <ChevronUp className="w-4 h-4 text-slate-400" />
                      : <ChevronDown className="w-4 h-4 text-slate-400" />
                    }
                  </div>
                </div>

                {expandedSpecs && allSpecKeys.map((key) => (
                  <CompareRow
                    key={key}
                    label={key.replace(/_/g, ' ')}
                    values={products.map((p) => p?.specs?.[key] ? String(p.specs[key]) : '—')}
                  />
                ))}
              </>
            )}

            {/* ─── Store Prices Breakdown ─── */}
            <div
              className="grid gap-3 mt-6 border-t border-slate-100 pt-4"
              style={{ gridTemplateColumns: `200px repeat(${products.length}, 1fr)` }}
            >
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider py-3">
                {t('Price by Store', 'السعر حسب المتجر')}
              </div>
              {products.map((p, i) => (
                <div key={i} className="space-y-1.5">
                  {p?.offers?.map((offer) => (
                    <a
                      key={offer.storeSlug}
                      href={offer.affiliateUrl || offer.storeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-brand-50 transition-colors group"
                      onClick={() => api.trackClick(offer.id).catch(() => {})}
                    >
                      <span className="text-xs text-slate-600 group-hover:text-brand-600 font-medium">
                        {lang === 'ar' ? offer.storeNameAr : offer.storeNameEn}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-900">{formatPrice(offer.price)}</span>
                        <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-brand-400" />
                      </div>
                    </a>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Compare Row Component ─────────────────────────────────────────────────
function CompareRow({
  label,
  values,
  highlight,
  isPrice,
}: {
  label: string;
  values: (React.ReactNode | string)[];
  highlight?: boolean[];
  isPrice?: boolean;
}) {
  return (
    <div
      className="grid gap-3 border-t border-slate-50 first:border-0"
      style={{ gridTemplateColumns: `200px repeat(${values.length}, 1fr)` }}
    >
      <div className="py-3 text-xs font-medium text-slate-500 capitalize flex items-center">
        {label}
      </div>
      {values.map((value, i) => (
        <div
          key={i}
          className={clsx(
            'py-3 text-sm font-semibold flex items-center',
            highlight?.[i] ? 'text-brand-600' : 'text-slate-800',
            isPrice && highlight?.[i] && 'text-lg',
          )}
        >
          {value}
        </div>
      ))}
    </div>
  );
}
