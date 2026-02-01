/** @type {import('next').NextConfig} */
const { version } = require('./package.json');

const nextConfig = {
  reactStrictMode: true,
  swcMinify: false,
  env: {
    NEXT_PUBLIC_VERSION: version,
  },
}

module.exports = nextConfig
