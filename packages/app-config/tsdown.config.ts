import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig = defineConfig([
  {
    entry: 'src/index.ts',
    format: ['cjs'],
    dts: true,
    sourcemap: true,
    outDir: 'dist',
    bundle: false,
  },
]);

export default config;
