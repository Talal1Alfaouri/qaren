'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Star, Share2, Heart,
  BarChart2, ShoppingBag, Info, CheckCircle,
} from 'lucide-react';
import { useApp } from '@/app/providers';
import { OfferCard } from '@/components/product/OfferCard';
import { PriceHistoryChart } from '@/components/product/PriceHistoryChart';
import type { Product } from '@/lib/api';
import clsx from 'clsx';

interface ProductDetailClientProps {
  product: Product;
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const { lang, t, formatPrice, dir } = useApp();
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab] = useState<'offers' | 'specs' | 'history'>('offers');
  const [wishlist, setWishlist] = useState(false);
  const [shared, setShared] = useState(false);

  const name = lang === 'ar' && product.nameAr ? product.nameAr : product.nameEn;
  const images = product.imageUrls?.length ? product.imageUrls : ['/placeholder.png'];
  const offers = (product.offers || []).filter((o) => o.isAvailable);
  const allOffers = product.offers || [];
  const cheapest = offers[0];
  const maxOriginal = allOffers.reduce((m, o) => Math.max(m, o.originalPrice || 0), 0);
  const discount = maxOriginal > (cheapest?.price || 0)
    ? Math.round(((maxOriginal - cheapest.price) / maxOriginal) * 100)
    : 0;

  const avgRating = allOffers.filter((o) => o.rating).reduce((s, o, _, a) => s + (o.rating! / a.length), 0);
  const totalReviews = allOffers.reduce((s, o) => s + (o.reviewCount || 0), 0);

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: name, url: window.location.href }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(window.location.href).catch(() => {});
    }
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  const tabs = [
    { id: 'offers', labelEn: `All Offers (${allOffers.length})`, labelAr: `كل العروض (${allOffers.length})`, icon: ShoppingBag },
    { id: 'history', labelEn: 'Price History', labelAr: 'تاريخ السعر', icon: BarChart2 },
    { id: 'specs', labelEn: 'Specifications', labelAr: 'المواصفات', icon: Info },
  ] as const;

  return (
    <div dir={dir} className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-500 mb-6">
        <Link href="/" className="hover:text-brand-500 transition-colors">{t('Home', 'الرئيسية')}</Link>
        <ChevronRight className={clsx('w-4 h-4 text-slate-300', dir === 'rtl' && 'rotate-180')} />
        {product.categoryNameEn && (
          <>
            <Link href={`/search?category=${product.categorySlug}`} className="hover:text-brand-500 transition-colors">
              {lang === 'ar' ? product.categoryNameAr : product.categoryNameEn}
            </Link>
            <ChevronRight className={clsx('w-4 h-4 text-slate-300', dir === 'rtl' && 'rotate-180')} />
          </>
        )}
        <span className="text-slate-700 truncate max-w-48">{name}</span>
      </nav>

      {/* ─── TOP SECTION ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Image Gallery */}
        <div className="space-y-3">
          {/* Main image */}
          <div className="relative aspect-square bg-white rounded-2xl border border-slate-100 overflow-hidden group">
            {images[activeImage] && images[activeImage] !== '/placeholder.png' ? (
              <Image
                src={images[activeImage]}
                alt={name}
                fill
                className="object-contain p-8 transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <ShoppingBag className="w-20 h-20 text-slate-200" />
              </div>
            )}

            {discount >= 5 && (
              <div className="absolute top-4 start-4 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-lg">
                -{discount}%
              </div>
            )}

            {/* Nav arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImage((i) => Math.max(0, i - 1))}
                  className="absolute start-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft className={clsx('w-4 h-4', dir === 'rtl' && 'rotate-180')} />
                </button>
                <button
                  onClick={() => setActiveImage((i) => Math.min(images.length - 1, i + 1))}
                  className="absolute end-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className={clsx('w-4 h-4', dir === 'rtl' && 'rotate-180')} />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={clsx(
                    'w-16 h-16 rounded-lg border-2 overflow-hidden shrink-0 transition-all',
                    i === activeImage ? 'border-brand-500 shadow-brand' : 'border-slate-200 hover:border-slate-300',
                  )}
                >
                  <Image src={img} alt="" width={64} height={64} className="object-contain p-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col gap-4">
          {/* Brand & category */}
          <div className="flex items-center gap-2">
            {product.brandName && (
              <span className="text-xs font-bold uppercase tracking-widest text-brand-500 bg-brand-50 px-2.5 py-1 rounded-lg">
                {product.brandName}
              </span>
            )}
            {product.categoryNameEn && (
              <Link
                href={`/search?category=${product.categorySlug}`}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                {lang === 'ar' ? product.categoryNameAr : product.categoryNameEn}
              </Link>
            )}
          </div>

          {/* Name */}
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 leading-snug">
            {name}
          </h1>

          {/* Rating summary */}
          {avgRating > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={clsx(
                      'w-4 h-4',
                      i < Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200',
                    )}
                  />
                ))}
              </div>
              <span className="text-sm font-semibold text-slate-700">{avgRating.toFixed(1)}</span>
              <span className="text-sm text-slate-400">
                ({totalReviews.toLocaleString()} {t('reviews', 'تقييم')})
              </span>
            </div>
          )}

          {/* Price section */}
          <div className="bg-gradient-to-br from-slate-50 to-brand-50/30 rounded-2xl p-5 border border-slate-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">{t('Starting from', 'يبدأ من')}</p>
                {maxOriginal > (cheapest?.price || 0) && (
                  <p className="price-original text-sm mb-0.5">{formatPrice(maxOriginal)}</p>
                )}
                <p className="price-tag text-4xl">{cheapest ? formatPrice(cheapest.price) : '—'}</p>
              </div>
              <div className="text-end">
                <p className="text-xs text-slate-500 mb-1">{t('Available at', 'متوفر في')}</p>
                <p className="text-2xl font-bold text-slate-900">{offers.length}</p>
                <p className="text-xs text-slate-500">{t('stores', 'متاجر')}</p>
              </div>
            </div>

            {cheapest && (
              <div className="mt-4 flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                <p className="text-sm text-green-700">
                  {t(`Best price at ${cheapest.storeNameEn}`, `أفضل سعر في ${cheapest.storeNameAr}`)}
                </p>
              </div>
            )}
          </div>

          {/* Quick action buttons */}
          <div className="flex gap-2">
            {cheapest && (
              <a
                href={cheapest.affiliateUrl || cheapest.storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary flex-1 justify-center"
                onClick={() => {
                  import('@/lib/api').then(({ api }) => api.trackClick(cheapest.id)).catch(() => {});
                }}
              >
                <ShoppingBag className="w-4 h-4" />
                {t('Buy Now', 'اشتر الآن')} — {cheapest.storeNameEn}
              </a>
            )}
            <button
              onClick={() => setWishlist(!wishlist)}
              className={clsx(
                'btn-secondary p-2.5 transition-colors',
                wishlist && 'text-red-500 border-red-200 bg-red-50',
              )}
              aria-label="Wishlist"
            >
              <Heart className={clsx('w-5 h-5', wishlist && 'fill-red-500')} />
            </button>
            <button onClick={handleShare} className="btn-secondary p-2.5" aria-label="Share">
              {shared ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Share2 className="w-5 h-5" />}
            </button>
          </div>

          {/* Description */}
          {product.descriptionEn && (
            <p className="text-sm text-slate-600 leading-relaxed line-clamp-4">
              {product.descriptionEn}
            </p>
          )}

          {/* Store availability chips */}
          <div>
            <p className="text-xs text-slate-500 mb-2">{t('Available at:', 'متوفر في:')}</p>
            <div className="flex flex-wrap gap-2">
              {allOffers.map((offer) => (
                <span
                  key={offer.storeSlug}
                  className={clsx(
                    'store-chip text-xs',
                    !offer.isAvailable && 'opacity-40 line-through',
                  )}
                >
                  {lang === 'ar' ? offer.storeNameAr : offer.storeNameEn}
                  {offer.isAvailable && (
                    <span className="text-brand-500 font-bold">{formatPrice(offer.price)}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── TABS ─── */}
      <div className="border-b border-slate-200 mb-6">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all duration-150 -mb-px',
                activeTab === tab.id
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700',
              )}
            >
              <tab.icon className="w-4 h-4" />
              {lang === 'ar' ? tab.labelAr : tab.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* ─── TAB CONTENT ─── */}
      <div className="animate-fade-in">
        {/* Offers Tab */}
        {activeTab === 'offers' && (
          <div className="space-y-3">
            {allOffers.length === 0 ? (
              <p className="text-center py-12 text-slate-400">{t('No offers available', 'لا توجد عروض')}</p>
            ) : (
              allOffers.map((offer, i) => (
                <div key={offer.id} className="relative">
                  <OfferCard offer={offer} isBest={i === 0} rank={i + 1} />
                </div>
              ))
            )}

            <p className="text-xs text-slate-400 text-center pt-2">
              * {t(
                'Prices are updated every few hours. Click to see current price on store.',
                'تُحدَّث الأسعار كل بضع ساعات. اضغط لرؤية السعر الحالي في المتجر.',
              )}
            </p>
          </div>
        )}

        {/* Price History Tab */}
        {activeTab === 'history' && (
          <div className="card p-6">
            <h3 className="font-semibold text-slate-800 mb-4">{t('Price History', 'تاريخ الأسعار')}</h3>
            <PriceHistoryChart productId={product.id} />
          </div>
        )}

        {/* Specs Tab */}
        {activeTab === 'specs' && (
          <div className="card p-6">
            {Object.keys(product.specs || {}).length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">
                {t('Specifications not available yet', 'المواصفات غير متاحة بعد')}
              </p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(product.specs).map(([key, value]) => (
                    <tr key={key}>
                      <td className="py-2.5 pe-4 font-medium text-slate-500 w-1/3 capitalize">
                        {key.replace(/_/g, ' ')}
                      </td>
                      <td className="py-2.5 text-slate-800">{String(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
