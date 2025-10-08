import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig = defineConfig([
  {
    entry: 'src/index.ts',
    format: ['cjs'],
    dts: true,
    sourcemap: true,
    outDir: 'dist',
  },
]);

export default config;
