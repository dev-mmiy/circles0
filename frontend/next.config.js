const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Disable ESLint during builds to avoid CI/CD failures
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // Disable image optimization in development to avoid Docker networking issues
    // In production, this should be enabled for better performance
    unoptimized: process.env.NODE_ENV === 'development',
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    domains: ['example.com', 'localhost'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'example.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 's.gravatar.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.gravatar.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.auth0.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.shoshinsha-design.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'www.shoshinsha-design.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Disable static optimization for pages that use client-side code
  experimental: {
    // optimizeCss: true,  // crittersモジュールエラーのため無効化
  },
  // Transpile Chart.js packages
  transpilePackages: ['chart.js', 'chartjs-plugin-zoom', 'chartjs-adapter-date-fns', 'react-chartjs-2'],
  // Webpack configuration for Chart.js
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    // Ignore Chart.js during server-side builds
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'chart.js': 'commonjs chart.js',
        'chartjs-plugin-zoom': 'commonjs chartjs-plugin-zoom',
        'chartjs-adapter-date-fns': 'commonjs chartjs-adapter-date-fns',
        'react-chartjs-2': 'commonjs react-chartjs-2',
      });
    }
    return config;
  },
  // Force dynamic rendering for pages that use client-side code
  trailingSlash: false,
  // Service Worker configuration
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
