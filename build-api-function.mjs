/**
 * Build script to bundle the Vercel API serverless function
 * This bundles all dependencies from server/* and shared/* into a single file
 */

import { build } from 'esbuild';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

console.log('🔨 Building Vercel API serverless function...\n');

const outfile = './api/index.js';

// Ensure output directory exists
mkdirSync(dirname(outfile), { recursive: true });

try {
  await build({
    entryPoints: ['./api/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'esm',
    outfile,
    external: [
      // Vercel and AWS runtime
      '@vercel/*',
      'aws-sdk',

      // Keep all node_modules external - they'll be available in Vercel
      'express',
      'cors',
      '@neondatabase/serverless',
      'drizzle-orm',
      'drizzle-zod',
      'zod',
      'zod-validation-error',
      'csv-stringify',
      'pdfkit',
      'json2csv',
      'file-saver',
      'jszip',

      // Build-time only dependencies
      'lightningcss',
      'vite',
      '@vitejs/*',
      'tailwindcss',
      'autoprefixer',
      'postcss',
    ],
    // Enable source maps for debugging
    sourcemap: false,
    // Keep names for better stack traces
    keepNames: true,
    // Handle .js imports from .ts files
    resolveExtensions: ['.ts', '.js', '.mjs', '.json'],
    // Don't minify to make debugging easier
    minify: false,
    logLevel: 'info',
    // Ensure ESM output
    banner: {
      js: '// Bundled API serverless function for Vercel\n',
    },
  });

  console.log('\n✅ API function bundled successfully!');
  console.log(`📦 Output: ${outfile}\n`);
} catch (error) {
  console.error('\n❌ Build failed:');
  console.error(error);
  process.exit(1);
}
