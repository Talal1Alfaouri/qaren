'use client';

import Link from 'next/link';
import { Zap, Heart } from 'lucide-react';
import { useApp } from '@/app/providers';

export function Footer() {
  const { lang, t, dir } = useApp();

  const stores = ['Noon', 'Amazon', 'Jarir', 'Extra', 'Al-Manea', 'SACO'];
  const categories = [
    { en: 'Mobiles', ar: 'جوالات', slug: 'mobiles' },
    { en: 'Laptops', ar: 'لابتوبات', slug: 'laptops' },
    { en: 'TVs', ar: 'تلفزيونات', slug: 'tvs' },
    { en: 'Appliances', ar: 'أجهزة منزلية', slug: 'home-appliances' },
    { en: 'Gaming', ar: 'ألعاب', slug: 'gaming' },
    { en: 'Wearables', ar: 'ساعات ذكية', slug: 'wearables' },
  ];

  return (
    <footer className="bg-slate-900 text-slate-400 mt-16" dir={dir}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white fill-white" />
              </div>
              <span className="font-display font-bold text-white text-lg">
                {lang === 'ar' ? 'قارن' : 'Qaren'}
              </span>
            </div>
            <p className="text-sm leading-relaxed">
              {t(
                'AI-powered price comparison for electronics & appliances across Saudi Arabia\'s top stores.',
                'مقارنة أسعار ذكية للإلكترونيات والأجهزة المنزلية عبر أكبر المتاجر في السعودية.',
              )}
            </p>
            <p className="text-xs mt-3 text-slate-500">
              {t(
                '* We may earn affiliate commissions from purchases.',
                '* قد نحصل على عمولات من عمليات الشراء.',
              )}
            </p>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">{t('Categories', 'الأقسام')}</h4>
            <ul className="space-y-2">
              {categories.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/search?category=${cat.slug}`}
                    className="text-sm hover:text-brand-400 transition-colors"
                  >
                    {lang === 'ar' ? cat.ar : cat.en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Stores */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">{t('Stores', 'المتاجر')}</h4>
            <ul className="space-y-2">
              {stores.map((store) => (
                <li key={store}>
                  <Link
                    href={`/search?store=${store.toLowerCase().replace(/\s/g, '-')}`}
                    className="text-sm hover:text-brand-400 transition-colors"
                  >
                    {store}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">{t('Company', 'الشركة')}</h4>
            <ul className="space-y-2">
              <li><Link href="/about" className="text-sm hover:text-brand-400 transition-colors">{t('About', 'عن قارن')}</Link></li>
              <li><Link href="/privacy" className="text-sm hover:text-brand-400 transition-colors">{t('Privacy Policy', 'سياسة الخصوصية')}</Link></li>
              <li><Link href="/terms" className="text-sm hover:text-brand-400 transition-colors">{t('Terms', 'الشروط والأحكام')}</Link></li>
              <li><Link href="/contact" className="text-sm hover:text-brand-400 transition-colors">{t('Contact', 'تواصل معنا')}</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} Qaren | قارن. {t('All rights reserved.', 'جميع الحقوق محفوظة.')}
          </p>
          <p className="text-xs text-slate-600 flex items-center gap-1">
            {t('Made with', 'صُنع بـ')} <Heart className="w-3 h-3 text-brand-500 fill-brand-500" /> {t('in Saudi Arabia', 'في السعودية')}
          </p>
        </div>
      </div>
    </footer>
  );
}
