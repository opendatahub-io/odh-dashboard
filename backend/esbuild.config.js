const esbuild = require('esbuild');
const esbuildPluginPino = require('esbuild-plugin-pino');

esbuild
  .build({
    entryPoints: ['src/server.ts'],
    bundle: true,
    platform: 'node',
    target: 'node22',
    outdir: 'dist',
    format: 'cjs',
    sourcemap: true,
    plugins: [esbuildPluginPino({ transports: ['pino-pretty'] })],
  })
  .then(() => {
    console.log('Backend bundled successfully');
  })
  .catch((err) => {
    console.error('Bundle failed:', err);
    throw err;
  });
