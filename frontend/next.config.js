/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  // Disable static optimization for pages that use client-side code
  experimental: {
    // optimizeCss: true,  // crittersモジュールエラーのため無効化
  },
  // Force dynamic rendering for pages that use client-side code
  trailingSlash: false,
};

module.exports = nextConfig;
