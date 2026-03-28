/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images-na.ssl-images-amazon.com' },
      { protocol: 'https', hostname: 'm.media-amazon.com' },
      { protocol: 'https', hostname: 'f.nooncdn.com' },
      { protocol: 'https', hostname: 'cdn.jarir.com' },
      { protocol: 'https', hostname: '*.extra.com' },
      { protocol: 'https', hostname: '*.saco.sa' },
      { protocol: 'https', hostname: '*.almanea.sa' },
      { protocol: 'https', hostname: '*.alsaifgallery.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
