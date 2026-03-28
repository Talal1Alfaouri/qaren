import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { ProductDetailClient } from './ProductDetailClient';

interface ProductPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  try {
    const product = await api.getProduct(params.slug);
    const name = product.nameEn;
    const image = product.imageUrls?.[0];
    const minPrice = product.offers?.[0]?.price;

    return {
      title: `${name} - Best Price in Saudi Arabia`,
      description: `Compare ${name} prices across Noon, Amazon, Jarir, Extra and more Saudi stores. ${minPrice ? `From SAR ${minPrice.toLocaleString()}.` : ''}`,
      openGraph: {
        title: `${name} | Qaren قارن`,
        description: `Find the best price for ${name} in Saudi Arabia.`,
        images: image ? [{ url: image, width: 800, height: 800 }] : [],
      },
    };
  } catch {
    return { title: 'Product Not Found' };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  let product;
  try {
    product = await api.getProduct(params.slug);
  } catch {
    notFound();
  }

  // JSON-LD Structured Data for SEO
  const offers = product.offers || [];
  const cheapest = offers[0];
  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.nameEn,
    description: product.descriptionEn,
    image: product.imageUrls,
    brand: product.brandName ? { '@type': 'Brand', name: product.brandName } : undefined,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'SAR',
      lowPrice: cheapest?.price,
      highPrice: offers[offers.length - 1]?.price,
      offerCount: offers.length,
      offers: offers.map((o) => ({
        '@type': 'Offer',
        url: o.affiliateUrl || o.storeUrl,
        price: o.price,
        priceCurrency: 'SAR',
        availability: o.isAvailable
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        seller: { '@type': 'Organization', name: o.storeNameEn },
      })),
    },
    aggregateRating: offers.some((o) => o.rating)
      ? {
          '@type': 'AggregateRating',
          ratingValue: (offers.reduce((s, o) => s + (o.rating || 0), 0) / offers.filter((o) => o.rating).length).toFixed(1),
          reviewCount: offers.reduce((s, o) => s + (o.reviewCount || 0), 0),
        }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailClient product={product} />
    </>
  );
}
