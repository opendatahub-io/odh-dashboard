/**
 * pnpm-safe include matchers for webpack/rspack asset and CSS rules.
 * npm-era absolute path prefixes miss .pnpm store paths and nested workspace deps.
 */
/* eslint-disable n/no-extraneous-require */
const path = require('path');

const PNPM_NODE_MODULES = /node_modules[/\\](?:\.pnpm[/\\][^/\\]+[/\\]node_modules[/\\])?/;

const isPatternFlyOrFontSource = (resourcePath) =>
  PNPM_NODE_MODULES.test(resourcePath) &&
  /(?:@patternfly|patternfly|@fontsource|monaco-editor|highlight\.js)/.test(resourcePath);

const isFontOrPficonAsset = (resourcePath) =>
  isPatternFlyOrFontSource(resourcePath) &&
  /(?:[/\\]fonts[/\\]|[/\\]pficon[/\\]|\.(?:woff2?|ttf|eot|svg)$)/i.test(resourcePath);

const isPatternFlyCss = (resourcePath, relativeDirname, rootNodeModules) => {
  const prefixes = [
    path.resolve(relativeDirname, 'node_modules/@patternfly'),
    path.resolve(rootNodeModules, '@patternfly'),
    path.resolve(rootNodeModules, '@odh-dashboard/ui-core/node_modules/@patternfly'),
  ];

  if (prefixes.some((prefix) => resourcePath.startsWith(prefix))) {
    return true;
  }

  return (
    (PNPM_NODE_MODULES.test(resourcePath) &&
      (/[/\\]@patternfly[/\\]react-styles[/\\]css[/\\]/.test(resourcePath) ||
        /[/\\]@patternfly[/\\][^/\\]+[/\\](?:dist[/\\]esm[/\\]css|react-styles[/\\]css)[/\\]/.test(
          resourcePath,
        ))) ||
    /[/\\]@odh-dashboard[/\\][^/\\]+[/\\]node_modules[/\\]@patternfly[/\\]/.test(resourcePath)
  );
};

const isVendorCss = (resourcePath, relativeDirname, rootNodeModules) => {
  if (isPatternFlyCss(resourcePath, relativeDirname, rootNodeModules)) {
    return true;
  }

  const vendorPrefixes = [
    path.resolve(relativeDirname, 'node_modules/monaco-editor'),
    path.resolve(relativeDirname, 'node_modules/@fontsource'),
    path.resolve(relativeDirname, 'node_modules/highlight.js'),
    path.resolve(rootNodeModules, 'monaco-editor'),
    path.resolve(rootNodeModules, '@fontsource'),
    path.resolve(rootNodeModules, 'highlight.js'),
  ];

  if (vendorPrefixes.some((prefix) => resourcePath.startsWith(prefix))) {
    return true;
  }

  return (
    PNPM_NODE_MODULES.test(resourcePath) &&
    /[/\\](?:monaco-editor|@fontsource|highlight\.js)[/\\]/.test(resourcePath)
  );
};

const patternFlyCssIncludes = (relativeDirname, rootNodeModules, srcDir, commonDir) => [
  srcDir,
  commonDir,
  path.resolve(relativeDirname, 'node_modules/@patternfly'),
  path.resolve(rootNodeModules, '@patternfly'),
  path.resolve(rootNodeModules, '@odh-dashboard/ui-core/node_modules/@patternfly'),
  path.resolve(relativeDirname, 'node_modules/monaco-editor'),
  path.resolve(relativeDirname, 'node_modules/@fontsource'),
  path.resolve(relativeDirname, 'node_modules/highlight.js'),
  path.resolve(rootNodeModules, 'monaco-editor'),
  path.resolve(rootNodeModules, '@fontsource'),
  path.resolve(rootNodeModules, 'highlight.js'),
  (resourcePath) => isVendorCss(resourcePath, relativeDirname, rootNodeModules),
];

const patternFlyFontIncludes = (relativeDirname, rootNodeModules) => [
  path.resolve(relativeDirname, 'node_modules/patternfly/dist/fonts'),
  path.resolve(relativeDirname, 'node_modules/@patternfly/react-core/dist/styles/assets/fonts'),
  path.resolve(relativeDirname, 'node_modules/@patternfly/react-core/dist/styles/assets/pficon'),
  path.resolve(relativeDirname, 'node_modules/@patternfly/patternfly/assets/fonts'),
  path.resolve(relativeDirname, 'node_modules/@patternfly/patternfly/assets/pficon'),
  path.resolve(relativeDirname, 'node_modules/monaco-editor'),
  path.resolve(relativeDirname, 'node_modules/@fontsource'),
  path.resolve(rootNodeModules, 'patternfly/dist/fonts'),
  path.resolve(rootNodeModules, '@patternfly/react-core/dist/styles/assets/fonts'),
  path.resolve(rootNodeModules, '@patternfly/react-core/dist/styles/assets/pficon'),
  path.resolve(rootNodeModules, '@patternfly/patternfly/assets/fonts'),
  path.resolve(rootNodeModules, '@patternfly/patternfly/assets/pficon'),
  path.resolve(rootNodeModules, 'monaco-editor'),
  path.resolve(rootNodeModules, '@fontsource'),
  isFontOrPficonAsset,
];

/**
 * Pin @tanstack/query-core to the version paired with this package's react-query install.
 * Hoisted v4 query-core at the repo root breaks react-query v5 module webpack builds in CI.
 */
const tanstackQueryCoreAlias = (relativeDirname) => {
  try {
    const reactQueryPkg = require.resolve('@tanstack/react-query/package.json', {
      paths: [relativeDirname],
    });
    const queryCorePkg = require.resolve('@tanstack/query-core/package.json', {
      paths: [path.dirname(reactQueryPkg)],
    });
    return { '@tanstack/query-core': path.dirname(queryCorePkg) };
  } catch {
    try {
      const queryCorePkg = require.resolve('@tanstack/query-core/package.json', {
        paths: [relativeDirname],
      });
      return { '@tanstack/query-core': path.dirname(queryCorePkg) };
    } catch {
      return {};
    }
  }
};

/**
 * Pin @mui/utils and @mui/system to the versions paired with this tree's @mui/material install.
 * Hoisted @mui/material@7 at the repo root breaks webpack subpath imports when @mui/utils is
 * missing or resolved to an incompatible hoisted version (common on CI fresh pnpm installs).
 */
const muiMaterialPeerAliases = (relativeDirname) => {
  const alias = {};

  for (const pkg of ['@mui/utils', '@mui/system']) {
    try {
      const materialPkg = require.resolve('@mui/material/package.json', {
        paths: [relativeDirname],
      });
      const peerPkg = require.resolve(`${pkg}/package.json`, {
        paths: [path.dirname(materialPkg)],
      });
      alias[pkg] = path.dirname(peerPkg);
    } catch {
      try {
        const peerPkg = require.resolve(`${pkg}/package.json`, {
          paths: [relativeDirname],
        });
        alias[pkg] = path.dirname(peerPkg);
      } catch {
        // Package not used in this frontend — skip.
      }
    }
  }

  return alias;
};

/**
 * Pin react/react-dom to a single install tree. pnpm + npm hybrid upstream builds can
 * resolve duplicate React copies and break module federation shared modules at runtime.
 */
const reactSingletonAliases = (relativeDirname) => {
  const alias = {};

  try {
    const reactPkg = require.resolve('react/package.json', { paths: [relativeDirname] });
    const reactDir = path.dirname(reactPkg);
    alias.react = reactDir;
    alias['react-dom'] = path.dirname(
      require.resolve('react-dom/package.json', { paths: [reactDir] }),
    );
    for (const subpath of ['jsx-runtime', 'jsx-dev-runtime']) {
      try {
        alias[`react/${subpath}`] = require.resolve(`react/${subpath}`, { paths: [reactDir] });
      } catch {
        // Subpath not present in this React version.
      }
    }
  } catch {
    // React not used in this frontend.
  }

  return alias;
};

const pnpmWebpackResolveAliases = (relativeDirname) => ({
  ...tanstackQueryCoreAlias(relativeDirname),
  ...muiMaterialPeerAliases(relativeDirname),
  ...reactSingletonAliases(relativeDirname),
});

module.exports = {
  isFontOrPficonAsset,
  isPatternFlyCss,
  isVendorCss,
  patternFlyCssIncludes,
  patternFlyFontIncludes,
  muiMaterialPeerAliases,
  pnpmWebpackResolveAliases,
  reactSingletonAliases,
  tanstackQueryCoreAlias,
};
