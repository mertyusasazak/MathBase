/** @type {import('next').NextConfig} */
const nextConfig = {
  // Monaco editor için webpack config
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false }
    return config
  },
}

module.exports = nextConfig
