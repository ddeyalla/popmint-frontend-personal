/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Fix for Konva's canvas dependency in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
      };
    }
    
    // Add support for resolving node_modules from parent directory
    config.resolve.modules.unshift('../node_modules');
    
    return config;
  },
  // Add this to ensure proper transpilation of the radix-ui packages
  transpilePackages: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-slot'],
};

module.exports = nextConfig;
