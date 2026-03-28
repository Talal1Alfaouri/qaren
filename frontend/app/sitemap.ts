import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://qaren.sa';
const API_URL  = process.env.NEXT_PUBLIC_API_URL  || 'http://localhost:3001';

async function fetchSlugs(): Promise<string[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/products/search?limit=1000&page=1`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.products || []).map((p: any) => p.slug as string);
  } catch {
    return [];
  }
}

async function fetchCategories(): Promise<string[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/products/categories`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((c: any) => c.slug as string);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slugs, categories] = await Promise.all([fetchSlugs(), fetchCategories()]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL,         lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE_URL}/search`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/compare`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
  ];

  const categoryPages: MetadataRoute.Sitemap = categories.map((slug) => ({
    url: `${BASE_URL}/search?category=${slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  const productPages: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${BASE_URL}/product/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'hourly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...categoryPages, ...productPages];
}
