const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
    domains: ['example.com', 'localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'example.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Disable static optimization for pages that use client-side code
  experimental: {
    // optimizeCss: true,  // crittersモジュールエラーのため無効化
  },
  // Force dynamic rendering for pages that use client-side code
  trailingSlash: false,
};

module.exports = withNextIntl(nextConfig);
