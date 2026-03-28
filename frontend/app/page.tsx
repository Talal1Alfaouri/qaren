import { Suspense } from 'react';
import { api } from '@/lib/api';
import { HomeClient } from './HomeClient';

export default async function HomePage() {
  // Parallel data fetching
  const [categories, deals] = await Promise.all([
    api.getCategories().catch(() => []),
    api.getDeals(12).catch(() => []),
  ]);

  return <HomeClient categories={categories} deals={deals} />;
}
