'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Star, Store, TrendingDown } from 'lucide-react';
import { useApp } from '@/app/providers';
import type { Product } from '@/lib/api';
import clsx from 'clsx';

interface ProductCardProps {
  product: Product;
  index?: number;
}

const STORE_COLORS: Record<string, string> = {
  noon:       'bg-yellow-50 text-yellow-700 border-yellow-200',
  'amazon-sa': 'bg-orange-50 text-orange-700 border-orange-200',
  jarir:      'bg-blue-50 text-blue-700 border-blue-200',
  extra:      'bg-purple-50 text-purple-700 border-purple-200',
  'al-manea': 'bg-green-50 text-green-700 border-green-200',
  alsaif:     'bg-red-50 text-red-700 border-red-200',
  saco:       'bg-teal-50 text-teal-700 border-teal-200',
};

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { lang, t, formatPrice } = useApp();

  const name = lang === 'ar' && product.nameAr ? product.nameAr : product.nameEn;
  const image = product.imageUrls?.[0];
  const cheapestOffer = product.offers?.[0];
  const hasDiscount = product.offers?.some((o) => o.originalPrice && o.originalPrice > o.price);
  const maxOriginalPrice = product.offers?.reduce((max, o) => Math.max(max, o.originalPrice || 0), 0) || 0;
  const discountPct = maxOriginalPrice > 0 && product.minPrice
    ? Math.round(((maxOriginalPrice - product.minPrice) / maxOriginalPrice) * 100)
    : product.discountPct || 0;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="card group flex flex-col hover:border-brand-200 animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Image */}
      <div className="relative aspect-square bg-slate-50 rounded-t-2xl overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ShoppingCart className="w-12 h-12 text-slate-200" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 start-2 flex flex-col gap-1">
          {discountPct >= 5 && (
            <span className="badge-deal text-[10px]">
              -{discountPct}%
            </span>
          )}
          {(product.storeCount || 0) > 2 && (
            <span className="badge bg-brand-50 text-brand-700 text-[10px] border border-brand-100">
              {product.storeCount} {t('stores', 'متاجر')}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        {/* Brand */}
        {product.brandName && (
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
            {product.brandName}
          </span>
        )}

        {/* Name */}
        <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-brand-600 transition-colors">
          {name}
        </h3>

        {/* Store chips */}
        {product.offers && product.offers.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto">
            {product.offers.slice(0, 3).map((offer) => (
              <span
                key={offer.storeSlug}
                className={clsx('text-[9px] font-bold px-1.5 py-0.5 rounded border', STORE_COLORS[offer.storeSlug] || 'bg-slate-50 text-slate-600 border-slate-200')}
              >
                {offer.storeNameEn}
              </span>
            ))}
            {(product.offers.length > 3) && (
              <span className="text-[9px] text-slate-400 px-1">+{product.offers.length - 3}</span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="flex items-end justify-between gap-2 mt-1">
          <div>
            {maxOriginalPrice > (product.minPrice || 0) && (
              <span className="price-original text-[11px] block">
                {formatPrice(maxOriginalPrice)}
              </span>
            )}
            <span className="price-tag text-lg">
              {formatPrice(product.minPrice || 0)}
            </span>
          </div>

          {hasDiscount && (
            <TrendingDown className="w-4 h-4 text-green-500 shrink-0 mb-1" />
          )}
        </div>
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="card flex flex-col">
      <div className="aspect-square bg-slate-100 rounded-t-2xl skeleton" />
      <div className="p-4 space-y-2">
        <div className="h-3 w-16 skeleton" />
        <div className="h-4 w-full skeleton" />
        <div className="h-4 w-3/4 skeleton" />
        <div className="h-6 w-24 skeleton mt-2" />
      </div>
    </div>
  );
}
