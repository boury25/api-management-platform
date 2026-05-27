/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'standalone' is only needed for Docker/self-hosted deployments.
  // Vercel uses its own build runner — omitting this lets all routes deploy correctly.
  ...(process.env.DOCKER_BUILD === 'true' && { output: 'standalone' }),
  experimental: {
    typedRoutes: false,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
