'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AppContextValue {
  lang: 'en' | 'ar';
  setLang: (l: 'en' | 'ar') => void;
  t: (en: string, ar: string) => string;
  dir: 'ltr' | 'rtl';
  currency: string;
  formatPrice: (price: number) => string;
}

const AppContext = createContext<AppContextValue>({} as AppContextValue);

export function useApp() {
  return useContext(AppContext);
}

export function Providers({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<'en' | 'ar'>('en');

  useEffect(() => {
    const saved = localStorage.getItem('qaren-lang') as 'en' | 'ar' | null;
    if (saved) {
      setLangState(saved);
    } else {
      // Auto-detect from browser
      const browserLang = navigator.language.startsWith('ar') ? 'ar' : 'en';
      setLangState(browserLang);
    }
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    localStorage.setItem('qaren-lang', lang);
  }, [lang]);

  const setLang = (l: 'en' | 'ar') => setLangState(l);

  const t = (en: string, ar: string) => lang === 'ar' ? ar : en;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : 'en-SA', {
      style: 'currency',
      currency: 'SAR',
      maximumFractionDigits: 0,
    }).format(price);

  return (
    <AppContext.Provider value={{ lang, setLang, t, dir: lang === 'ar' ? 'rtl' : 'ltr', currency: 'SAR', formatPrice }}>
      {children}
    </AppContext.Provider>
  );
}
