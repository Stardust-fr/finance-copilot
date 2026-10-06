import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Expose backend URL to client-side code
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  },
  // Proxy /api/* to backend during development to avoid CORS in browser
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
