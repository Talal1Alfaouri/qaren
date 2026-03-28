'use client';

import { useState } from 'react';
import { Bell, BellOff, Check, ChevronDown } from 'lucide-react';
import { useApp } from '@/app/providers';
import clsx from 'clsx';

interface PriceAlertWidgetProps {
  productId: string;
  currentPrice: number;
  productName: string;
}

export function PriceAlertWidget({ productId, currentPrice, productName }: PriceAlertWidgetProps) {
  const { lang, t, formatPrice } = useApp();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [targetPrice, setTargetPrice] = useState(Math.floor(currentPrice * 0.9));
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const suggestedPrices = [
    { label: t('-5%', '-٥٪'), value: Math.floor(currentPrice * 0.95) },
    { label: t('-10%', '-١٠٪'), value: Math.floor(currentPrice * 0.9) },
    { label: t('-20%', '-٢٠٪'), value: Math.floor(currentPrice * 0.8) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !targetPrice) return;

    setLoading(true);
    setError('');

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiBase}/api/v1/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, email, targetPrice }),
      });

      if (!res.ok) throw new Error('Failed to create alert');
      setSubmitted(true);
    } catch {
      setError(t('Something went wrong. Try again.', 'حدث خطأ. حاول مرة أخرى.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={clsx(
          'flex items-center gap-2 w-full px-4 py-3 rounded-xl border text-sm font-semibold transition-all duration-200',
          open || submitted
            ? 'bg-amber-50 border-amber-200 text-amber-700'
            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700',
        )}
      >
        {submitted ? (
          <>
            <Check className="w-4 h-4 text-green-500" />
            {t('Alert set!', 'تم ضبط التنبيه!')}
          </>
        ) : (
          <>
            <Bell className="w-4 h-4" />
            {t('Set Price Alert', 'تنبيه السعر')}
            <ChevronDown className={clsx('w-4 h-4 ms-auto transition-transform', open && 'rotate-180')} />
          </>
        )}
      </button>

      {open && !submitted && (
        <div className="absolute top-full start-0 end-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-card-hover p-4 z-20 animate-slide-up">
          <h4 className="font-semibold text-slate-800 text-sm mb-1">
            {t('Notify me when price drops to:', 'أخبرني عندما ينخفض السعر إلى:')}
          </h4>
          <p className="text-xs text-slate-500 mb-3">
            {t(`Current: ${formatPrice(currentPrice)}`, `السعر الحالي: ${formatPrice(currentPrice)}`)}
          </p>

          {/* Quick preset buttons */}
          <div className="flex gap-2 mb-3">
            {suggestedPrices.map((s) => (
              <button
                key={s.value}
                onClick={() => setTargetPrice(s.value)}
                className={clsx(
                  'flex-1 text-xs py-1.5 rounded-lg border font-semibold transition-colors',
                  targetPrice === s.value
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-brand-300',
                )}
              >
                {s.label}<br />
                <span className="font-normal text-[10px] opacity-80">{formatPrice(s.value)}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-2">
            {/* Custom price input */}
            <div className="relative">
              <span className="absolute start-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">SAR</span>
              <input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(Number(e.target.value))}
                min={1}
                max={currentPrice - 1}
                className="input-base ps-12 text-sm"
                required
              />
            </div>

            {/* Email */}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('your@email.com', 'بريدك@الإلكتروني.com')}
              className="input-base text-sm"
              required
            />

            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center text-sm py-2.5"
            >
              <Bell className="w-3.5 h-3.5" />
              {loading
                ? t('Setting alert...', 'جاري الضبط...')
                : t('Notify me', 'أخبرني')}
            </button>

            <p className="text-[10px] text-slate-400 text-center">
              {t('We\'ll email you once when the price drops.', 'سنرسل لك بريداً إلكترونياً مرة واحدة عند انخفاض السعر.')}
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
