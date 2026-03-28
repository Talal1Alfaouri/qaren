'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Globe, Menu, X, Zap } from 'lucide-react';
import { useApp } from '@/app/providers';
import clsx from 'clsx';

export function Header() {
  const { lang, setLang, t, dir } = useApp();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    setMobileOpen(false);
  };

  const navLinks = [
    { href: '/search?category=mobiles', labelEn: 'Mobiles', labelAr: 'جوالات' },
    { href: '/search?category=laptops', labelEn: 'Laptops', labelAr: 'لابتوبات' },
    { href: '/search?category=tvs', labelEn: 'TVs', labelAr: 'تلفزيونات' },
    { href: '/search?category=home-appliances', labelEn: 'Appliances', labelAr: 'أجهزة منزلية' },
  ];

  return (
    <header
      className={clsx(
        'sticky top-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100'
          : 'bg-white border-b border-slate-100',
      )}
      dir={dir}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Main row */}
        <div className="flex items-center gap-4 h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center
                            group-hover:bg-brand-600 transition-colors shadow-brand">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="font-display font-bold text-xl text-slate-900">
              {lang === 'ar' ? 'قارن' : 'Qaren'}
            </span>
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden sm:block">
            <div className="relative group">
              <Search
                className={clsx(
                  'absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-500 transition-colors',
                  dir === 'rtl' ? 'right-3' : 'left-3',
                )}
              />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('Search products, brands, stores...', 'ابحث عن منتجات، ماركات، متاجر...')}
                className={clsx(
                  'input-base text-sm h-10',
                  dir === 'rtl' ? 'pr-9 pl-24' : 'pl-9 pr-24',
                  'bg-slate-50 focus:bg-white',
                )}
              />
              <button
                type="submit"
                className={clsx(
                  'absolute top-1/2 -translate-y-1/2 h-7 px-3 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-lg transition-colors',
                  dir === 'rtl' ? 'left-1.5' : 'right-1.5',
                )}
              >
                {t('Search', 'بحث')}
              </button>
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-1 ms-auto sm:ms-0">
            {/* Language toggle */}
            <button
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="btn-ghost text-xs gap-1.5"
              aria-label="Toggle language"
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline font-semibold">{lang === 'en' ? 'عربي' : 'EN'}</span>
            </button>

            {/* Mobile menu toggle */}
            <button
              className="sm:hidden btn-ghost"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Category nav */}
        <nav className="hidden sm:flex items-center gap-1 h-10 -mt-1 pb-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="btn-ghost text-xs font-semibold text-slate-500 hover:text-brand-600 px-3 py-1.5"
            >
              {lang === 'ar' ? link.labelAr : link.labelEn}
            </Link>
          ))}
          <Link href="/search" className="btn-ghost text-xs font-semibold text-slate-500 hover:text-brand-600 px-3 py-1.5 ms-auto">
            {t('All Deals →', 'كل العروض ←')}
          </Link>
        </nav>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="sm:hidden border-t border-slate-100 py-3 space-y-2 animate-slide-up">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className={clsx('absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400', dir === 'rtl' ? 'right-3' : 'left-3')} />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('Search...', 'بحث...')}
                  className={clsx('input-base text-sm', dir === 'rtl' ? 'pr-9' : 'pl-9')}
                />
              </div>
            </form>
            <div className="flex flex-wrap gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="store-chip text-xs"
                >
                  {lang === 'ar' ? link.labelAr : link.labelEn}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
