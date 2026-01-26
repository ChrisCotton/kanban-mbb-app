/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // Legacy domains support (for Next.js < 13)
    domains: ['emxejsyyelcdpejxuvfd.supabase.co'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  // Fix for file watching issues with dynamic routes
  experimental: {
    // Disable turbopack to avoid file watching issues
    // turbopack: false,
    // Optimize file watching for App Router
    optimizePackageImports: [],
  },
  // Configure file watching to avoid path resolution errors
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  webpack: (config, { isServer, webpack, dev }) => {
    // Fix for path.relative undefined errors in file watching
    // Only apply in development mode
    if (dev) {
      // Apply watchOptions to both client and server
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.next/**',
          '**/.git/**',
          '**/__tests__/**',
          '**/__mocks__/**',
          '**/.DS_Store',
        ],
        aggregateTimeout: 300,
        poll: process.platform === 'darwin' ? 1000 : false, // Use polling on macOS to avoid file watcher issues
        followSymlinks: false, // Disable symlink following to avoid path resolution issues
      };
      
      // Add a plugin to catch and handle path resolution errors
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.DefinePlugin({
          'process.env.NEXT_WATCH_OPTIONS': JSON.stringify({
            ignored: ['**/node_modules/**', '**/.next/**'],
          }),
        })
      );
    }
    
    return config;
  },
}

module.exports = nextConfig
