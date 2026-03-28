'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ExternalLink, Star, Crown, ShieldCheck } from 'lucide-react';
import { useApp } from '@/app/providers';
import { Offer, api } from '@/lib/api';
import clsx from 'clsx';

const STORE_LOGOS: Record<string, string> = {
  noon:        '🌙',
  'amazon-sa': '📦',
  jarir:       '📚',
  extra:       '⚡',
  'al-manea':  '🏠',
  alsaif:      '🛒',
  saco:        '🔧',
};

interface OfferCardProps {
  offer: Offer;
  isBest?: boolean;
  rank: number;
}

export function OfferCard({ offer, isBest, rank }: OfferCardProps) {
  const { lang, t, formatPrice } = useApp();
  const [clicked, setClicked] = useState(false);
  const [loading, setLoading] = useState(false);

  const discount = offer.originalPrice && offer.originalPrice > offer.price
    ? Math.round(((offer.originalPrice - offer.price) / offer.originalPrice) * 100)
    : 0;

  const storeName = lang === 'ar' ? offer.storeNameAr : offer.storeNameEn;

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await api.trackClick(offer.id);
      setClicked(true);
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
    window.open(offer.affiliateUrl || offer.storeUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={clsx(
        'card flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 transition-all duration-200',
        isBest
          ? 'border-brand-200 bg-brand-50/30 ring-1 ring-brand-200'
          : 'hover:border-slate-200',
      )}
    >
      {/* Rank */}
      <div className={clsx(
        'hidden sm:flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0',
        rank === 1 ? 'bg-amber-100 text-amber-600' :
        rank === 2 ? 'bg-slate-100 text-slate-500' :
        'bg-slate-50 text-slate-400',
      )}>
        {rank === 1 ? <Crown className="w-4 h-4" /> : rank}
      </div>

      {/* Store info */}
      <div className="flex items-center gap-3 min-w-[140px]">
        <div className={clsx(
          'w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-white border border-slate-100 shadow-sm shrink-0',
        )}>
          {STORE_LOGOS[offer.storeSlug] || '🏪'}
        </div>
        <div>
          <p className="font-semibold text-sm text-slate-800">{storeName}</p>
          {offer.rating && (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-[11px] text-slate-500">
                {offer.rating.toFixed(1)}
                {offer.reviewCount ? ` (${offer.reviewCount.toLocaleString()})` : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Availability badge */}
      <div className="flex items-center gap-1">
        <span className={clsx(
          'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full',
          offer.isAvailable
            ? 'bg-green-50 text-green-700'
            : 'bg-red-50 text-red-600',
        )}>
          <span className={clsx('w-1.5 h-1.5 rounded-full', offer.isAvailable ? 'bg-green-500' : 'bg-red-400')} />
          {offer.isAvailable ? t('In Stock', 'متوفر') : t('Out of Stock', 'غير متوفر')}
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Price & CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
        <div className="sm:text-end">
          {offer.originalPrice && offer.originalPrice > offer.price && (
            <div className="flex items-center gap-2">
              <span className="price-original text-xs">{formatPrice(offer.originalPrice)}</span>
              <span className="badge-deal text-[10px]">-{discount}%</span>
            </div>
          )}
          <span className={clsx('price-tag text-xl', isBest && 'text-brand-600')}>
            {formatPrice(offer.price)}
          </span>
        </div>

        <button
          onClick={handleClick}
          disabled={!offer.isAvailable || loading}
          className={clsx(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shrink-0 w-full sm:w-auto justify-center',
            isBest
              ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-brand hover:shadow-lg hover:-translate-y-0.5'
              : 'bg-slate-900 hover:bg-slate-800 text-white hover:-translate-y-0.5',
            !offer.isAvailable && 'opacity-40 cursor-not-allowed hover:translate-y-0',
          )}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {loading ? t('...', '...') : t('Buy Now', 'اشتر الآن')}
        </button>
      </div>

      {/* Best deal ribbon */}
      {isBest && (
        <div className="absolute top-0 end-0 translate-x-0 -translate-y-0">
          <div className="flex items-center gap-1 bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-2xl">
            <ShieldCheck className="w-3 h-3" />
            {t('Best Price', 'أفضل سعر')}
          </div>
        </div>
      )}
    </div>
  );
}
