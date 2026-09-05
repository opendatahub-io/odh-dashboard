const path = require('path');
const { rspack } = require('@rspack/core');
const { merge } = require('rspack-merge');
const ContextualTildeResolverPlugin = require('./contextualTildeResolverPlugin');
const CheckSingletonDuplicatesPlugin = require('./checkSingletonDuplicatesPlugin');
const createRspackCommon = require('../../base/config/rspack.common.js');
const GenerateDistributionExtensionsPlugin = require('../../base/config/generateDistributionExtensionsPlugin.js');
const { dependencies: portalDependencies } = require('../package.json');

const SRC_DIR = path.resolve(__dirname, '../src');
const REPO_ROOT = path.resolve(__dirname, '../../..');
const TITLE = 'MaaS Consumer Portal';

const DIST_DIR = path.resolve(__dirname, '..');
const PORTAL_NODE_MODULES = path.resolve(DIST_DIR, 'node_modules');

// MaaS and GenAI frontend sources are statically bundled into this distribution, but they are
// installed as independent npm projects with their own node_modules (see Dockerfile.workspace).
// Without deduping, their imports of react/PatternFly/plugin-sdk resolve to those nested copies,
// duplicating the framework singletons and breaking React hooks and PF/plugin-sdk contexts.
//
// The set of packages that MUST be a single copy is derived from the eager, no-fallback singletons
// in packages/app-config/src/webpack/shared-modules-meta.ts (the same source of truth used by the
// Module Federation host), so the list stays in sync automatically instead of drifting.
// Required by absolute path: app-config's package "exports" map does not expose this file as a
// subpath, and Node strips the .ts types at require time.
const { sharedPluginModules, getSharedModuleMetadata } = require(path.resolve(
  REPO_ROOT,
  'packages/app-config/src/webpack/shared-modules-meta.ts',
));

const EAGER_SINGLETON_PACKAGES = Object.keys(sharedPluginModules).filter((name) => {
  const meta = getSharedModuleMetadata(name);
  return meta.eager && !meta.allowFallback && Object.hasOwn(portalDependencies, name);
});

// Resolve from the portal's own node_modules so every copy collapses to the workspace-hoisted one.
const resolveSingle = (request) => require.resolve(request, { paths: [PORTAL_NODE_MODULES] });

// Resolve a package's root directory (the node_modules/<name> folder), independent of its "exports"
// map — locate the entry then trim back to the package root marker.
const resolveDir = (name) => {
  const entry = require.resolve(name, { paths: [PORTAL_NODE_MODULES] });
  const marker = `${path.sep}${path.join('node_modules', name)}`;
  return entry.slice(0, entry.lastIndexOf(marker) + marker.length);
};

// A bare-specifier alias ("react$") only matches `import 'react'` — it does NOT catch subpath
// imports like `@patternfly/react-core/dist/esm/...` or `@patternfly/react-styles/css/...`, which is
// how PatternFly is consumed almost everywhere. Those subpaths would fall through to the nested
// per-package node_modules and duplicate the singleton. Aliasing the package DIRECTORY (no `$`)
// covers the bare specifier plus every on-disk subpath in one entry.
//
// TRADEOFF — directory aliasing bypasses each package's "exports" map for SUBPATH requests (a bare
// import still resolves the aliased directory's package.json, so its "exports" "." entry IS honored;
// only subpaths are resolved as raw filesystem paths). This is a deliberate choice:
//   * The clean alternative — a resolver plugin that redirects to the pinned copy and lets the normal
//     resolver apply "exports" — is unavailable: rspack's Rust resolver does not support webpack-style
//     resolve.plugins (see contextualTildeResolverPlugin.js).
//   * Enumerating an exact "exports"-honoring `$` alias per subpath is impractical because of
//     PatternFly's large, ever-changing CSS subpath surface — the very reason for aliasing the
//     directory.
//   * For react / react-dom / @patternfly/* / @openshift/*, the imported subpaths are identity
//     mappings in "exports" (./dist/... → the same file), so directory aliasing is behaviorally
//     equivalent to honoring "exports".
//   * react-router is the one package with a divergent "exports" map (dev/prod builds at non-mirroring
//     paths); its only remapped subpath actually imported, /dom, is handled below with an exact
//     "exports"-honoring override.
// Residual risk: a future, not-yet-imported subpath of a package whose "exports" remaps it to a
// different physical file. CheckSingletonDuplicatesPlugin catches the duplication that would cause.
// The root-cause fix (installing the composed frontends as hoisted workspace members, so there are no
// nested node_modules to dedupe) would remove this whole block and honor "exports" natively.
//
// Exports-remapped subpaths whose on-disk path differs from the request path — e.g. react-router/dom
// resolves via "exports" to dist/.../dom-export.mjs and has no file at the literal ./dom path, so
// directory aliasing can't resolve it — are listed here and aliased with an exact `$` entry
// (require.resolve honors "exports"). The exact entries are ordered first so they win over the
// directory alias for the same package.
const SUBPATH_RUNTIME_ALIASES = ['react-router/dom'];

const SHARED_RUNTIME_ALIASES = {
  ...Object.fromEntries(SUBPATH_RUNTIME_ALIASES.map((name) => [`${name}$`, resolveSingle(name)])),
  ...Object.fromEntries(EAGER_SINGLETON_PACKAGES.map((name) => [name, resolveDir(name)])),
};

// ~/ imports are aliases that resolve to a single directory per build.
// When multiple packages compile in one build, ~/ becomes ambiguous. Each
// entry tells ContextualTildeResolverPlugin to resolve ~/ to the correct src/
// based on which package the importing file belongs to.
// (#~/ imports are unaffected — they use Node.js subpath imports and resolve
// per-package via each package.json "imports" field.)
const tildeMappings = [
  {
    dir: path.resolve(REPO_ROOT, 'packages/maas'),
    src: path.resolve(REPO_ROOT, 'packages/maas/frontend/src'),
  },
  {
    dir: path.resolve(REPO_ROOT, 'packages/gen-ai'),
    src: path.resolve(REPO_ROOT, 'packages/gen-ai/frontend/src'),
  },
];

module.exports = (overrides = {}) =>
  merge(
    createRspackCommon({
      distributionSrcDir: SRC_DIR,
      title: TITLE,
      ...overrides,
    }),
    {
      module: {
        rules: [
          // gen-ai playground → @patternfly/chatbot → monaco-editor (codicon.ttf, etc.)
          {
            test: /\.(svg|ttf|eot|woff|woff2)$/,
            include: [
              path.resolve(REPO_ROOT, 'node_modules/monaco-editor'),
              path.resolve(REPO_ROOT, 'packages/gen-ai/frontend/node_modules/monaco-editor'),
            ],
            type: 'asset/resource',
            generator: {
              filename: 'fonts/[name][ext]',
            },
          },
        ],
      },
      resolve: {
        // Force framework singletons to a single copy (see SHARED_RUNTIME_ALIASES above). Other
        // dependencies resolve from their owning package.
        alias: SHARED_RUNTIME_ALIASES,
        modules: ['node_modules'],
      },
      plugins: [
        new ContextualTildeResolverPlugin(tildeMappings),
        new CheckSingletonDuplicatesPlugin(EAGER_SINGLETON_PACKAGES),
        new rspack.DefinePlugin({
          'process.env.ODH_PRODUCT_NAME': JSON.stringify(TITLE),
        }),
        new GenerateDistributionExtensionsPlugin({
          configPath: path.resolve(__dirname, '../distribution.yaml'),
          targetFile: path.join(SRC_DIR, 'distribution-extensions.ts'),
        }),
      ],
    },
  );
