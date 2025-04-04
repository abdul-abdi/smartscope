/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Handle large packages with output file tracing excludes
  outputFileTracingExcludes: {
    '*': ['node_modules/solc/**/*']
  },
  // Handle environment variables
  env: {
    APP_NAME: 'Karibu',
    APP_VERSION: '1.0.0',
  },
};

module.exports = nextConfig; 