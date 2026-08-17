const path = require('path');

/**
 * Rspack plugin that resolves `~/` imports contextually based on the
 * importing file's location. In Module Federation each package has its own
 * build where `~/` maps to that package's `frontend/src/`. When statically
 * bundled in a distribution (single rspack build), the alias conflicts. This
 * plugin inspects the issuer path and rewrites `~/` to the correct package
 * source directory.
 *
 * Uses NormalModuleReplacementPlugin because rspack's Rust resolver does not
 * support webpack-style resolve.plugins.
 *
 * @param {Array<{dir: string, src: string}>} mappings
 *   dir — package root (used for prefix matching against the issuer)
 *   src — the directory `~/` should resolve to when the issuer is under `dir`
 */
class ContextualTildeResolverPlugin {
  constructor(mappings) {
    this.mappings = mappings.map(({ dir, src }) => ({
      dir: path.resolve(dir) + path.sep,
      src: path.resolve(src),
    }));
  }

  apply(compiler) {
    const { NormalModuleReplacementPlugin } = compiler.webpack;

    new NormalModuleReplacementPlugin(/^~\//, (resource) => {
      const issuer = resource.contextInfo?.issuer || resource.context;
      if (!issuer) {
        return;
      }

      const normalizedIssuer = path.resolve(issuer);
      const mapping = this.mappings.find((m) => normalizedIssuer.startsWith(m.dir));
      if (!mapping) {
        return;
      }

      // eslint-disable-next-line no-param-reassign
      resource.request = path.join(mapping.src, resource.request.slice(2));
    }).apply(compiler);
  }
}

module.exports = ContextualTildeResolverPlugin;
