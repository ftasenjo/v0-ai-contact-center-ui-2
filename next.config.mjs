import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Ensure Turbopack uses THIS repo as root (prevents it choosing ~/ by mistake
  // when multiple lockfiles exist).
  turbopack: {
    root: __dirname,
  },
 
}

export default nextConfig
