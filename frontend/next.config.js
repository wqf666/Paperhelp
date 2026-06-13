/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export' is only needed for Tauri production builds.
  // In dev mode it blocks dynamic routes that aren't pre-generated.
  ...(process.env.BUILD_EXPORT === 'true' ? { output: 'export' } : {}),
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
}
module.exports = nextConfig
