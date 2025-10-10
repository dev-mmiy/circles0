/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  images: {
    unoptimized: true,
  },
  // experimental: {
  //   optimizeCss: true,  // crittersモジュールエラーのため無効化
  // },
};

module.exports = nextConfig;
