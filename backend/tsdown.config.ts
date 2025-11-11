import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: ['src/**/*.ts', '!src/**/__tests__/**'],
    format: ['cjs'],
    dts: false,
    sourcemap: true,
    outDir: 'dist',
    bundle: false,
  },
]);
