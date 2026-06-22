import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.tenantreport.ai',
      },
    ],
  },
  turbopack: {
    resolveAlias: {
      'tailwindcss': path.resolve(__dirname, 'node_modules/tailwindcss'),
    },
  },
};

export default nextConfig;
