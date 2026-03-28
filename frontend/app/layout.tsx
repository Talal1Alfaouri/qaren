import type { Metadata, Viewport } from 'next';
import { Inter, Cairo, Plus_Jakarta_Sans } from 'next/font/google';
import '../styles/globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const cairo = Cairo({ subsets: ['arabic', 'latin'], variable: '--font-cairo', display: 'swap' });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-plus-jakarta', display: 'swap' });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://qaren.sa';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Qaren | قارن - Compare Prices in Saudi Arabia',
    template: '%s | Qaren قارن',
  },
  description: 'Compare prices for electronics & home appliances across Noon, Amazon, Jarir, Extra and more stores in Saudi Arabia. Find the best deals instantly.',
  keywords: ['price comparison', 'مقارنة أسعار', 'Saudi Arabia', 'السعودية', 'electronics', 'Noon', 'Amazon', 'Jarir', 'Extra'],
  authors: [{ name: 'Qaren', url: siteUrl }],
  creator: 'Qaren',
  openGraph: {
    type: 'website',
    locale: 'en_SA',
    alternateLocale: 'ar_SA',
    url: siteUrl,
    siteName: 'Qaren | قارن',
    title: 'Qaren | قارن - Compare Prices in Saudi Arabia',
    description: 'Compare prices for electronics across top Saudi stores. Save money instantly.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Qaren | قارن',
    description: 'Compare prices across Saudi stores',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large' },
  },
  alternates: {
    canonical: siteUrl,
    languages: { 'en-SA': `${siteUrl}/en`, 'ar-SA': `${siteUrl}/ar` },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ea580c',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className={`${inter.variable} ${cairo.variable} ${plusJakarta.variable} antialiased`}>
        <Providers>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
