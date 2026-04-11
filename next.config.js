/** @type {import('next').NextConfig} */
const nextConfig = {
  // Monaco editor için webpack config (Sadece client tarafında fs'yi kapat)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { 
        ...config.resolve.fallback,
        fs: false, 
        path: false 
      }
    }
    return config
  },
}

module.exports = nextConfig
