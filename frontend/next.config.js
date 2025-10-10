/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  // experimental: {
  //   optimizeCss: true,  // crittersモジュールエラーのため無効化
  // },
};

module.exports = nextConfig;
