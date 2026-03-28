'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api, PricePoint } from '@/lib/api';
import { useApp } from '@/app/providers';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

const STORE_COLORS: Record<string, string> = {
  noon:        '#f59e0b',
  'amazon-sa': '#f97316',
  jarir:       '#3b82f6',
  extra:       '#8b5cf6',
  'al-manea':  '#10b981',
  alsaif:      '#ef4444',
  saco:        '#14b8a6',
};

interface PriceHistoryChartProps {
  productId: string;
}

export function PriceHistoryChart({ productId }: PriceHistoryChartProps) {
  const { lang, t, formatPrice } = useApp();
  const [data, setData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    api.getPriceHistory(productId, days)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [productId, days]);

  // Group by date, pivot by store
  const chartData = (() => {
    const byDate: Record<string, Record<string, number>> = {};
    for (const point of data) {
      const date = new Date(point.recordedAt).toLocaleDateString(
        lang === 'ar' ? 'ar-SA' : 'en-SA',
        { month: 'short', day: 'numeric' },
      );
      if (!byDate[date]) byDate[date] = {};
      byDate[date][point.storeSlug] = point.price;
    }
    return Object.entries(byDate).map(([date, prices]) => ({ date, ...prices }));
  })();

  const stores = [...new Set(data.map((d) => d.storeSlug))];

  // Trend analysis
  const trend = (() => {
    if (data.length < 2) return null;
    const sorted = [...data].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
    const first = sorted[0].price;
    const last = sorted[sorted.length - 1].price;
    const diff = ((last - first) / first) * 100;
    return { diff, direction: diff < -1 ? 'down' : diff > 1 ? 'up' : 'flat' };
  })();

  if (loading) {
    return <div className="h-64 skeleton rounded-xl" />;
  }

  if (data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-slate-400 text-sm">
        {t('No price history available yet', 'لا يوجد تاريخ أسعار حتى الآن')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {trend && (
            <span className={`flex items-center gap-1 text-sm font-semibold ${
              trend.direction === 'down' ? 'text-green-600' : trend.direction === 'up' ? 'text-red-500' : 'text-slate-500'
            }`}>
              {trend.direction === 'down' ? <TrendingDown className="w-4 h-4" /> :
               trend.direction === 'up' ? <TrendingUp className="w-4 h-4" /> :
               <Minus className="w-4 h-4" />}
              {Math.abs(trend.diff).toFixed(1)}%
              {' '}
              {t(
                trend.direction === 'down' ? 'price drop' : trend.direction === 'up' ? 'price increase' : 'stable',
                trend.direction === 'down' ? 'انخفاض' : trend.direction === 'up' ? 'ارتفاع' : 'مستقر',
              )}
            </span>
          )}
        </div>

        {/* Period selector */}
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                days === d
                  ? 'bg-brand-500 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {d}{t('d', 'ي')}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v.toLocaleString()}`}
            width={60}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              formatPrice(value),
              stores.find((s) => s === name) || name,
            ]}
            contentStyle={{
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px -4px rgba(0,0,0,0.12)',
              fontSize: '12px',
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span style={{ fontSize: '11px', color: '#64748b' }}>{value}</span>}
          />
          {stores.map((store) => (
            <Line
              key={store}
              type="monotone"
              dataKey={store}
              stroke={STORE_COLORS[store] || '#94a3b8'}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
