/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // GET /version.json answers with the version this build was made from
  // (pages/api/version.ts), so a deploy can be verified by the version it
  // reports.
  async rewrites() {
    return [{ source: '/version.json', destination: '/api/version' }]
  },
}

module.exports = nextConfig
