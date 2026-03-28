'use client';

import { useState } from 'react';
import { SlidersHorizontal, X, LayoutGrid, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '@/app/providers';
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard';
import { SearchFilters } from '@/components/search/SearchFilters';
import type { Category, SearchResult } from '@/lib/api';
import clsx from 'clsx';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

interface SearchClientProps {
  categories: Category[];
  initialResults: SearchResult;
  searchParams: Record<string, string | undefined>;
}

export function SearchClient({ categories, initialResults, searchParams }: SearchClientProps) {
  const { lang, t, dir } = useApp();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const params = useSearchParams();
  const router = useRouter();

  const q = searchParams.q || '';
  const { products, total, page, totalPages } = initialResults;

  const buildPageUrl = (p: number) => {
    const sp = new URLSearchParams(params.toString());
    sp.set('page', String(p));
    return `/search?${sp}`;
  };

  return (
    <div dir={dir} className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        {q && (
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/" className="hover:text-brand-500">{t('Home', 'الرئيسية')}</Link>
            <span>/</span>
            <span className="text-slate-700">{t('Search', 'بحث')}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {q ? (
                <>
                  {t('Results for', 'نتائج')} <span className="text-brand-600">"{q}"</span>
                </>
              ) : (
                t('All Products', 'كل المنتجات')
              )}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {total.toLocaleString()} {t('products found', 'منتج تم العثور عليه')}
            </p>
          </div>

          {/* Filter toggle (mobile) */}
          <button
            onClick={() => setFiltersOpen(true)}
            className="lg:hidden btn-secondary text-sm"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {t('Filters', 'تصفية')}
          </button>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar filters - desktop */}
        <div className="hidden lg:block w-52 shrink-0">
          <div className="sticky top-24">
            <SearchFilters categories={categories} />
          </div>
        </div>

        {/* Mobile filters drawer */}
        {filtersOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setFiltersOpen(false)}
            />
            <div className={clsx(
              'fixed top-0 bottom-0 z-50 w-72 bg-white shadow-2xl p-5 overflow-y-auto lg:hidden',
              dir === 'rtl' ? 'left-0' : 'right-0',
            )}>
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold">{t('Filters', 'التصفية')}</span>
                <button onClick={() => setFiltersOpen(false)}>
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <SearchFilters categories={categories} onClose={() => setFiltersOpen(false)} />
            </div>
          </>
        )}

        {/* Results */}
        <div className="flex-1 min-w-0">
          {products.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🔍</div>
              <h2 className="text-xl font-bold text-slate-700 mb-2">{t('No products found', 'لا توجد نتائج')}</h2>
              <p className="text-slate-500 text-sm mb-6">
                {t(
                  'Try different keywords or remove some filters.',
                  'جرب كلمات مختلفة أو أزل بعض المرشحات.',
                )}
              </p>
              <Link href="/search" className="btn-secondary">
                {t('Browse all products', 'تصفح كل المنتجات')}
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  {page > 1 && (
                    <Link href={buildPageUrl(page - 1)} className="btn-secondary p-2.5">
                      <ChevronLeft className={clsx('w-4 h-4', dir === 'rtl' && 'rotate-180')} />
                    </Link>
                  )}

                  {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                    const p = Math.max(1, Math.min(page - 3, totalPages - 6)) + i;
                    if (p > totalPages) return null;
                    return (
                      <Link
                        key={p}
                        href={buildPageUrl(p)}
                        className={clsx(
                          'w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors',
                          p === page
                            ? 'bg-brand-500 text-white'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50',
                        )}
                      >
                        {p}
                      </Link>
                    );
                  })}

                  {page < totalPages && (
                    <Link href={buildPageUrl(page + 1)} className="btn-secondary p-2.5">
                      <ChevronRight className={clsx('w-4 h-4', dir === 'rtl' && 'rotate-180')} />
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
