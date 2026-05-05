import { defineConfig } from 'tsup';

export default defineConfig([
  // ESM builds
  {
    entry: { index: 'src/index.ts', react: 'src/react.ts' },
    format: ['esm'],
    outDir: 'dist',
    minify: true,
    dts: true,
    splitting: false,
    sourcemap: false,
    clean: true,
  },
  // IIFE build
  {
    entry: { index: 'src/index.ts' },
    format: ['iife'],
    outDir: 'dist',
    outExtension: () => ({ js: '.iife.js' }),
    minify: true,
    dts: false,
    splitting: false,
    sourcemap: false,
  },
]);
