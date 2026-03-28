import { Suspense } from 'react';
import { api } from '@/lib/api';
import { SearchClient } from './SearchClient';

interface SearchPageProps {
  searchParams: {
    q?: string;
    category?: string;
    brand?: string;
    store?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
    page?: string;
  };
}

export function generateMetadata({ searchParams }: SearchPageProps) {
  const q = searchParams.q;
  return {
    title: q ? `"${q}" prices in Saudi Arabia` : 'Search Products',
    description: q
      ? `Compare prices for "${q}" across Noon, Amazon, Jarir, Extra and more stores in Saudi Arabia.`
      : 'Browse and compare electronics prices in Saudi Arabia.',
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const [categories, results] = await Promise.all([
    api.getCategories().catch(() => []),
    api.search({
      q: searchParams.q,
      category: searchParams.category,
      brand: searchParams.brand,
      store: searchParams.store,
      minPrice: searchParams.minPrice ? parseFloat(searchParams.minPrice) : undefined,
      maxPrice: searchParams.maxPrice ? parseFloat(searchParams.maxPrice) : undefined,
      sort: (searchParams.sort as any) || 'relevance',
      page: searchParams.page ? parseInt(searchParams.page) : 1,
      limit: 24,
    }).catch(() => ({ products: [], total: 0, page: 1, limit: 24, totalPages: 0 })),
  ]);

  return (
    <SearchClient
      categories={categories}
      initialResults={results}
      searchParams={searchParams}
    />
  );
}
