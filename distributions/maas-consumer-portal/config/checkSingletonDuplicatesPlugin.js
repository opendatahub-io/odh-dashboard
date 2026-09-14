const path = require('path');

/**
 * Fails the build when more than one physical copy of an eager singleton package
 * (react, @patternfly/react-core, @openshift/dynamic-plugin-sdk, ...) ends up in
 * the bundle.
 *
 * A distribution may statically compose frontend sources that are installed as
 * independent npm projects with their own node_modules. Without the resolve.alias
 * dedupe in rspack.common.js, imports from those sources resolve to their nested
 * copies of react/PatternFly/plugin-sdk — duplicating singletons and breaking React
 * hooks and PatternFly/plugin-sdk contexts at runtime.
 *
 * The aliases cover the bare specifier plus the known imported subpaths. This
 * plugin is the safety net: if a new (aliased-but-uncovered) subpath slips through
 * to a nested copy, the build fails here instead of silently shipping two runtimes.
 */
class CheckSingletonDuplicatesPlugin {
  /**
   * @param {string[]} packages Eager singleton package names that must resolve to a single copy.
   */
  constructor(packages) {
    this.packages = packages;
  }

  apply(compiler) {
    const pluginName = 'CheckSingletonDuplicatesPlugin';

    compiler.hooks.afterCompile.tap(pluginName, (compilation) => {
      // package name -> set of distinct package roots that provided a bundled module
      const rootsByPackage = new Map();

      for (const module of compilation.modules) {
        const { resource } = module;
        if (!resource) {
          continue;
        }

        for (const pkg of this.packages) {
          // e.g. "/node_modules/@patternfly/react-core/" — trailing separator avoids
          // matching sibling packages that share a prefix (react vs react-dom).
          const marker = `${path.sep}${path.join('node_modules', pkg)}${path.sep}`;
          const idx = resource.lastIndexOf(marker);
          if (idx === -1) {
            continue;
          }

          // Root of the copy that actually provided this file (innermost node_modules).
          const root = resource.slice(0, idx + marker.length - 1);
          if (!rootsByPackage.has(pkg)) {
            rootsByPackage.set(pkg, new Set());
          }
          rootsByPackage.get(pkg).add(root);
        }
      }

      const duplicates = [...rootsByPackage.entries()].filter(([, roots]) => roots.size > 1);
      if (duplicates.length > 0) {
        const details = duplicates
          .map(([pkg, roots]) => `  ${pkg}:\n${[...roots].map((r) => `    ${r}`).join('\n')}`)
          .join('\n');
        compilation.errors.push(
          new Error(
            `[singleton-dedupe] Multiple copies of eager singleton packages were bundled. ` +
              `Add the missing subpath to SHARED_RUNTIME_ALIASES in rspack.common.js:\n${details}`,
          ),
        );
      }
    });
  }
}

module.exports = CheckSingletonDuplicatesPlugin;
