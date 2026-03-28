'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import { useApp } from '@/app/providers';
import { Category } from '@/lib/api';
import clsx from 'clsx';

const STORES = [
  { slug: 'noon',       en: 'Noon',    ar: 'نون' },
  { slug: 'amazon-sa',  en: 'Amazon',  ar: 'أمازون' },
  { slug: 'jarir',      en: 'Jarir',   ar: 'جرير' },
  { slug: 'extra',      en: 'Extra',   ar: 'اكسترا' },
  { slug: 'al-manea',   en: 'Al Manea', ar: 'المنيع' },
  { slug: 'alsaif',     en: 'Al-Saif', ar: 'السيف' },
  { slug: 'saco',       en: 'Saco',    ar: 'ساكو' },
];

const PRICE_RANGES = [
  { label_en: 'Under SAR 500',     label_ar: 'أقل من 500 ريال',     min: 0,    max: 500  },
  { label_en: 'SAR 500 – 1,500',   label_ar: '500 – 1,500 ريال',    min: 500,  max: 1500 },
  { label_en: 'SAR 1,500 – 3,000', label_ar: '1,500 – 3,000 ريال',  min: 1500, max: 3000 },
  { label_en: 'SAR 3,000 – 6,000', label_ar: '3,000 – 6,000 ريال',  min: 3000, max: 6000 },
  { label_en: 'Over SAR 6,000',    label_ar: 'أكثر من 6,000 ريال',  min: 6000, max: 0    },
];

interface FiltersProps {
  categories: Category[];
  onClose?: () => void;
}

export function SearchFilters({ categories, onClose }: FiltersProps) {
  const { lang, t, dir } = useApp();
  const router = useRouter();
  const params = useSearchParams();

  const activeCategory = params.get('category') || '';
  const activeStore    = params.get('store') || '';
  const activeMinPrice = params.get('minPrice') || '';
  const activeMaxPrice = params.get('maxPrice') || '';
  const activeSort     = params.get('sort') || 'relevance';

  const updateFilter = (key: string, value: string | null) => {
    const p = new URLSearchParams(params.toString());
    if (value === null || value === '') {
      p.delete(key);
    } else {
      p.set(key, value);
    }
    p.delete('page');
    router.push(`/search?${p}`);
    onClose?.();
  };

  const clearAll = () => {
    const q = params.get('q');
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
    onClose?.();
  };

  const hasActiveFilters = activeCategory || activeStore || activeMinPrice || activeMaxPrice;

  return (
    <aside dir={dir} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-sm text-slate-700">{t('Filters', 'التصفية')}</span>
        </div>
        {hasActiveFilters && (
          <button onClick={clearAll} className="text-xs text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
            <X className="w-3 h-3" />
            {t('Clear all', 'مسح الكل')}
          </button>
        )}
      </div>

      {/* Sort */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t('Sort by', 'ترتيب حسب')}</h4>
        <div className="space-y-1">
          {[
            { value: 'relevance', en: 'Relevance', ar: 'الأكثر صلة' },
            { value: 'price_asc', en: 'Price: Low to High', ar: 'السعر: الأقل أولاً' },
            { value: 'price_desc', en: 'Price: High to Low', ar: 'السعر: الأعلى أولاً' },
            { value: 'popular', en: 'Most Popular', ar: 'الأكثر شعبية' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateFilter('sort', opt.value)}
              className={clsx(
                'w-full text-start px-3 py-1.5 rounded-lg text-sm transition-colors',
                activeSort === opt.value
                  ? 'bg-brand-50 text-brand-600 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50',
              )}
            >
              {lang === 'ar' ? opt.ar : opt.en}
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t('Category', 'الفئة')}</h4>
        <div className="space-y-1">
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => updateFilter('category', activeCategory === cat.slug ? '' : cat.slug)}
              className={clsx(
                'w-full text-start px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-between',
                activeCategory === cat.slug
                  ? 'bg-brand-50 text-brand-600 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50',
              )}
            >
              <span>{lang === 'ar' ? cat.nameAr : cat.nameEn}</span>
              <span className="text-xs text-slate-400">{cat.productCount}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stores */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t('Store', 'المتجر')}</h4>
        <div className="space-y-1">
          {STORES.map((store) => (
            <button
              key={store.slug}
              onClick={() => updateFilter('store', activeStore === store.slug ? '' : store.slug)}
              className={clsx(
                'w-full text-start px-3 py-1.5 rounded-lg text-sm transition-colors',
                activeStore === store.slug
                  ? 'bg-brand-50 text-brand-600 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50',
              )}
            >
              {lang === 'ar' ? store.ar : store.en}
            </button>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t('Price Range', 'نطاق السعر')}</h4>
        <div className="space-y-1">
          {PRICE_RANGES.map((range) => {
            const isActive = activeMinPrice === String(range.min) &&
              (range.max ? activeMaxPrice === String(range.max) : !activeMaxPrice);
            return (
              <button
                key={`${range.min}-${range.max}`}
                onClick={() => {
                  if (isActive) {
                    updateFilter('minPrice', null);
                    updateFilter('maxPrice', null);
                  } else {
                    const p = new URLSearchParams(params.toString());
                    p.set('minPrice', String(range.min));
                    if (range.max) p.set('maxPrice', String(range.max));
                    else p.delete('maxPrice');
                    p.delete('page');
                    router.push(`/search?${p}`);
                  }
                }}
                className={clsx(
                  'w-full text-start px-3 py-1.5 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-600 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50',
                )}
              >
                {lang === 'ar' ? range.label_ar : range.label_en}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
