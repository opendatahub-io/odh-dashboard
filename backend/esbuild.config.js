const esbuild = require('esbuild');
const esbuildPluginPino = require('esbuild-plugin-pino');

// @kubernetes/client-node v0.12.3 depends on shelljs, which uses dynamic
// require('./src/' + command) that esbuild cannot statically analyze.
// shelljs is only invoked on Windows (WSL kubeconfig detection) — never in
// our Linux containers. We alias it to an empty module so the entire
// @kubernetes/client-node dependency tree can be bundled.
// If upgrading @kubernetes/client-node, verify shelljs is still unused at
// runtime or replace this alias with an `external` entry and ship node_modules.
const emptyShelljs = {
  name: 'empty-shelljs',
  setup(build) {
    build.onResolve({ filter: /^shelljs$/ }, () => ({
      path: 'shelljs',
      namespace: 'empty-shelljs',
    }));
    build.onLoad({ filter: /.*/, namespace: 'empty-shelljs' }, () => ({
      contents: 'module.exports = {};',
      loader: 'js',
    }));
  },
};

esbuild
  .build({
    entryPoints: ['src/server.ts'],
    bundle: true,
    platform: 'node',
    target: 'node22',
    outdir: 'dist',
    format: 'cjs',
    sourcemap: true,
    plugins: [emptyShelljs, esbuildPluginPino({ transports: ['pino-pretty'] })],
  })
  .then(() => {
    console.log('Backend bundled successfully');
  })
  .catch((err) => {
    console.error('Bundle failed:', err);
    throw err;
  });
