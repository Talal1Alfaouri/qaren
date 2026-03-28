'use client';

import { useEffect, useState } from 'react';
import {
  Package, ShoppingBag, Store, MousePointer, RefreshCw,
  TrendingUp, CheckCircle, XCircle, Clock, Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import clsx from 'clsx';

interface DashboardStats {
  stats: {
    totalProducts: number;
    totalOffers: number;
    totalStores: number;
    clicks24h: number;
    clicks7d: number;
    clicks30d: number;
    scrapesToday: number;
  };
  topProducts: Array<{ id: string; slug: string; nameEn: string; viewCount: number; image: string }>;
  topStores: Array<{ slug: string; nameEn: string; logoUrl: string; clickCount: number }>;
  recentScrapes: Array<{
    id: string;
    storeName: string;
    storeSlug: string;
    status: string;
    productsFound: number;
    productsUpdated: number;
    createdAt: string;
  }>;
}

export default function AdminPage() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [scraperStatus, setScraperStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  const load = async () => {
    setLoading(true);
    const [dash, scraper] = await Promise.all([
      api.getAdminStats().catch(() => null),
      api.getScraperStatus().catch(() => null),
    ]);
    setData(dash as DashboardStats);
    setScraperStatus(scraper);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const triggerScrape = async () => {
    setTriggering(true);
    await api.triggerScrape().catch(console.error);
    setTimeout(() => { load(); setTriggering(false); }, 2000);
  };

  const statCards = data ? [
    { label: 'Products', value: data.stats.totalProducts?.toLocaleString(), icon: Package, color: 'bg-blue-50 text-blue-600' },
    { label: 'Live Offers', value: data.stats.totalOffers?.toLocaleString(), icon: ShoppingBag, color: 'bg-green-50 text-green-600' },
    { label: 'Stores', value: data.stats.totalStores?.toLocaleString(), icon: Store, color: 'bg-purple-50 text-purple-600' },
    { label: 'Clicks (24h)', value: data.stats.clicks24h?.toLocaleString(), icon: MousePointer, color: 'bg-brand-50 text-brand-600' },
    { label: 'Clicks (7d)', value: data.stats.clicks7d?.toLocaleString(), icon: TrendingUp, color: 'bg-amber-50 text-amber-600' },
    { label: 'Scrapes Today', value: data.stats.scrapesToday?.toLocaleString(), icon: RefreshCw, color: 'bg-teal-50 text-teal-600' },
  ] : [];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Qaren Admin</h1>
              <p className="text-xs text-slate-500">Price comparison dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={clsx(
              'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full',
              scraperStatus?.isRunning
                ? 'bg-amber-100 text-amber-700 animate-pulse-soft'
                : 'bg-green-100 text-green-700',
            )}>
              <span className={clsx('w-2 h-2 rounded-full', scraperStatus?.isRunning ? 'bg-amber-500' : 'bg-green-500')} />
              {scraperStatus?.isRunning ? 'Scraping...' : 'Idle'}
            </div>

            <button
              onClick={triggerScrape}
              disabled={triggering || scraperStatus?.isRunning}
              className="btn-primary text-sm py-2"
            >
              <RefreshCw className={clsx('w-4 h-4', triggering && 'animate-spin')} />
              {triggering ? 'Starting...' : 'Run Scrape'}
            </button>

            <button onClick={load} className="btn-secondary p-2">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="card p-4 h-24 skeleton" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {statCards.map((card, i) => (
              <div key={card.label} className="card p-4 animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center mb-3', card.color)}>
                  <card.icon className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{card.value || '0'}</div>
                <div className="text-xs text-slate-500 mt-0.5">{card.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Products */}
          <div className="card p-5 lg:col-span-1">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-500" />
              Top Products
            </h2>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }, (_, i) => <div key={i} className="h-10 skeleton rounded-lg" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {data?.topProducts?.map((product, i) => (
                  <a
                    key={product.id}
                    href={`/product/${product.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <span className="w-5 text-xs font-bold text-slate-400 shrink-0">#{i + 1}</span>
                    <span className="text-sm text-slate-700 flex-1 truncate">{product.nameEn}</span>
                    <span className="text-xs text-slate-400 shrink-0">{product.viewCount?.toLocaleString()} views</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Top Stores */}
          <div className="card p-5 lg:col-span-1">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <MousePointer className="w-4 h-4 text-brand-500" />
              Store Clicks (30d)
            </h2>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 7 }, (_, i) => <div key={i} className="h-8 skeleton rounded-lg" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {data?.topStores?.map((store, i) => {
                  const max = data.topStores[0]?.clickCount || 1;
                  const pct = Math.round((store.clickCount / max) * 100);
                  return (
                    <div key={store.slug} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700">{store.nameEn}</span>
                        <span className="text-xs font-semibold text-slate-500">{store.clickCount?.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Scrapes */}
          <div className="card p-5 lg:col-span-1">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-brand-500" />
              Recent Scrapes
            </h2>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-10 skeleton rounded-lg" />)}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {data?.recentScrapes?.map((job) => (
                  <div key={job.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 text-xs">
                    {job.status === 'completed' ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    ) : job.status === 'failed' ? (
                      <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    <span className="font-medium text-slate-700 truncate flex-1">{job.storeName}</span>
                    <span className="text-slate-400 shrink-0">
                      {job.productsFound} found
                    </span>
                    <span className="text-slate-300 shrink-0">
                      {new Date(job.createdAt).toLocaleTimeString('en-SA', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Scraper Queue */}
        {scraperStatus?.queueLength > 0 && (
          <div className="card p-4 border-amber-200 bg-amber-50">
            <p className="text-sm text-amber-700 font-semibold flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Scraper running — {scraperStatus.queueLength} jobs in queue
            </p>
          </div>
        )}

        {/* Footer */}
        <p className="text-xs text-center text-slate-400 pb-4">
          Qaren Admin Panel · Last updated {new Date().toLocaleString('en-SA')}
        </p>
      </div>
    </div>
  );
}
