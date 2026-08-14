const path = require('path');

/**
 * Webpack resolve plugin that resolves `~/` imports contextually based on the
 * importing file's location. In Module Federation each package has its own
 * webpack build where `~/` maps to that package's `frontend/src/`. When
 * statically bundled in a distribution (single webpack build), the alias
 * conflicts. This plugin inspects the issuer path and resolves `~/` to the
 * correct package source directory.
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

  apply(resolver) {
    const target = resolver.ensureHook('resolve');

    resolver
      .getHook('described-resolve')
      .tapAsync('ContextualTildeResolverPlugin', (request, resolveContext, callback) => {
        const req = request.request;
        if (!req || !req.startsWith('~/')) {
          return callback();
        }

        const issuer = request.context?.issuer || request.path;
        if (!issuer) {
          return callback();
        }

        const normalizedIssuer = path.resolve(issuer);
        const mapping = this.mappings.find((m) => normalizedIssuer.startsWith(m.dir));
        if (!mapping) {
          return callback();
        }

        const newRequest = path.join(mapping.src, req.slice(2));
        const obj = {
          ...request,
          request: newRequest,
        };

        resolver.doResolve(
          target,
          obj,
          `ContextualTildeResolver: ${req} → ${newRequest}`,
          resolveContext,
          callback,
        );
      });
  }
}

module.exports = ContextualTildeResolverPlugin;
