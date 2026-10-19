// Transpiles ESM-only node_modules (e.g. @kubernetes/client-node >= 1.0) to CommonJS for Jest using esbuild.
const { transformSync } = require('esbuild');

module.exports = {
  process(sourceText, sourcePath) {
    const { code, map } = transformSync(sourceText, {
      loader: 'js',
      format: 'cjs',
      target: 'node22',
      sourcemap: 'external',
      sourcefile: sourcePath,
    });
    return { code, map };
  },
};
