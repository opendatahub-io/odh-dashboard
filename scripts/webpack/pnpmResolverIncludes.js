/**
 * pnpm-safe include matchers for webpack/rspack asset and CSS rules.
 * npm-era absolute path prefixes miss .pnpm store paths and nested workspace deps.
 */
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

module.exports = {
  isFontOrPficonAsset,
  isPatternFlyCss,
  isVendorCss,
  patternFlyCssIncludes,
  patternFlyFontIncludes,
};
