'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Zap, TrendingDown, Star, ArrowRight, Smartphone, Laptop, Tv, Home } from 'lucide-react';
import { useApp } from '@/app/providers';
import { ProductCard } from '@/components/product/ProductCard';
import type { Category, Product } from '@/lib/api';
import clsx from 'clsx';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  mobiles: <Smartphone className="w-6 h-6" />,
  laptops: <Laptop className="w-6 h-6" />,
  tvs: <Tv className="w-6 h-6" />,
  'home-appliances': <Home className="w-6 h-6" />,
};

const STORE_LOGOS = [
  { name: 'Noon', emoji: '🌙', color: 'bg-yellow-50 border-yellow-200' },
  { name: 'Amazon', emoji: '📦', color: 'bg-orange-50 border-orange-200' },
  { name: 'Jarir', emoji: '📚', color: 'bg-blue-50 border-blue-200' },
  { name: 'Extra', emoji: '⚡', color: 'bg-purple-50 border-purple-200' },
  { name: 'Al-Manea', emoji: '🏠', color: 'bg-green-50 border-green-200' },
  { name: 'SACO', emoji: '🔧', color: 'bg-teal-50 border-teal-200' },
  { name: 'Al-Saif', emoji: '🛒', color: 'bg-red-50 border-red-200' },
];

const POPULAR_SEARCHES = [
  'iPhone 15', 'Samsung S24', 'MacBook Pro', 'AirPods', 'Samsung TV', 'PlayStation 5', 'Dyson', 'iPad',
];

interface HomeClientProps {
  categories: Category[];
  deals: Product[];
}

export function HomeClient({ categories, deals }: HomeClientProps) {
  const { lang, t, dir } = useApp();
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div dir={dir} className="space-y-16 pb-16">
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-brand-900">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -end-40 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -start-20 w-80 h-80 bg-brand-600/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 start-1/3 w-64 h-64 bg-orange-500/5 rounded-full blur-2xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-brand-500/20 border border-brand-500/30 text-brand-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 animate-fade-in">
            <Zap className="w-3 h-3 fill-brand-400 text-brand-400" />
            {t('AI-Powered Price Comparison', 'مقارنة أسعار بالذكاء الاصطناعي')}
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-white mb-4 tracking-tight animate-slide-up">
            {lang === 'ar' ? (
              <>قارن الأسعار، <span className="text-brand-400">وفّر أكثر</span></>
            ) : (
              <>Compare prices,<br /><span className="text-brand-400">Save more.</span></>
            )}
          </h1>

          <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto animate-slide-up animation-delay-100">
            {t(
              'Find the best deals on electronics & home appliances across Noon, Amazon, Jarir, Extra, and more.',
              'اعثر على أفضل عروض الإلكترونيات والأجهزة المنزلية عبر نون وأمازون وجرير واكسترا والمزيد.',
            )}
          </p>

          {/* Search box */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto animate-slide-up animation-delay-200">
            <div className="relative flex items-center bg-white rounded-2xl shadow-2xl overflow-hidden p-1.5">
              <Search className={clsx('w-5 h-5 text-slate-400 shrink-0 mx-3', dir === 'rtl' ? 'order-3' : 'order-1')} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t(
                  'Search for iPhone 15, Samsung TV, MacBook...',
                  'ابحث عن آيفون 15، سامسونج TV، ماك بوك...',
                )}
                className={clsx(
                  'flex-1 h-12 bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none text-base',
                  dir === 'rtl' ? 'order-2 text-right' : 'order-2 text-left',
                )}
              />
              <button
                type="submit"
                className="btn-primary shrink-0 h-10 order-3 sm:order-3"
              >
                {t('Search', 'بحث')}
              </button>
            </div>
          </form>

          {/* Popular searches */}
          <div className="flex flex-wrap justify-center gap-2 mt-5 animate-slide-up animation-delay-300">
            {POPULAR_SEARCHES.map((term) => (
              <button
                key={term}
                onClick={() => router.push(`/search?q=${encodeURIComponent(term)}`)}
                className="text-xs text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 px-3 py-1 rounded-full transition-all duration-150"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── STORES ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <p className="text-center text-xs text-slate-400 uppercase tracking-widest font-semibold mb-5">
          {t('Comparing prices from', 'نقارن الأسعار من')}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {STORE_LOGOS.map((store, i) => (
            <div
              key={store.name}
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold text-slate-600 animate-fade-in',
                store.color,
              )}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="text-lg">{store.emoji}</span>
              {store.name}
            </div>
          ))}
        </div>
      </section>

      {/* ─── CATEGORIES ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="section-title">{t('Browse Categories', 'تصفح الأقسام')}</h2>
            <p className="section-subtitle">{t('Find the best prices by category', 'أفضل الأسعار حسب الفئة')}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {categories.map((cat, i) => (
            <Link
              key={cat.slug}
              href={`/search?category=${cat.slug}`}
              className={clsx(
                'card flex flex-col items-center justify-center gap-2 p-5 text-center hover:border-brand-200 hover:bg-brand-50/30 group animate-fade-in',
              )}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="w-12 h-12 bg-brand-50 group-hover:bg-brand-100 rounded-xl flex items-center justify-center text-brand-600 transition-colors">
                {CATEGORY_ICONS[cat.slug] || <Star className="w-6 h-6" />}
              </div>
              <span className="text-sm font-semibold text-slate-700 group-hover:text-brand-600 transition-colors">
                {lang === 'ar' ? cat.nameAr : cat.nameEn}
              </span>
              {cat.productCount > 0 && (
                <span className="text-[10px] text-slate-400">{cat.productCount.toLocaleString()} {t('products', 'منتج')}</span>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* ─── DEALS ─── */}
      {deals.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-5 h-5 text-brand-500" />
                <h2 className="section-title mb-0">{t('Best Deals', 'أفضل العروض')}</h2>
              </div>
              <p className="section-subtitle">{t('Biggest price drops right now', 'أكبر تخفيضات الأسعار الآن')}</p>
            </div>
            <Link href="/search?sort=price_asc" className="btn-ghost text-sm">
              {t('View all', 'عرض الكل')}
              <ArrowRight className={clsx('w-4 h-4', dir === 'rtl' && 'rotate-180')} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {deals.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* ─── HOW IT WORKS ─── */}
      <section className="bg-white border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
          <h2 className="section-title text-center mb-10">{t('How Qaren Works', 'كيف يعمل قارن')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                en: { title: 'Search', desc: 'Search for any product — phone, TV, laptop, appliance.' },
                ar: { title: 'ابحث', desc: 'ابحث عن أي منتج — جوال، تلفزيون، لابتوب، جهاز منزلي.' },
                icon: '🔍',
              },
              {
                step: '02',
                en: { title: 'Compare', desc: 'See all prices from Noon, Amazon, Jarir, Extra and more side by side.' },
                ar: { title: 'قارن', desc: 'شاهد جميع الأسعار من نون وأمازون وجرير واكسترا جنباً إلى جنب.' },
                icon: '⚖️',
              },
              {
                step: '03',
                en: { title: 'Save', desc: 'Click the best deal and buy directly from the store. We track the savings.' },
                ar: { title: 'وفّر', desc: 'اضغط على أفضل عرض واشتر مباشرة من المتجر. نحن نتتبع توفيرك.' },
                icon: '💰',
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-50 rounded-2xl text-2xl mb-4">
                  {item.icon}
                </div>
                <div className="text-[10px] font-bold text-brand-400 tracking-widest uppercase mb-1">{item.step}</div>
                <h3 className="font-bold text-slate-900 mb-2">{lang === 'ar' ? item.ar.title : item.en.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{lang === 'ar' ? item.ar.desc : item.en.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
