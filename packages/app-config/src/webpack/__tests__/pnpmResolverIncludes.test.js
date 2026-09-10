const path = require('path');

const { isFontOrPficonAsset, isPatternFlyCss, isVendorCss } = require('../pnpmResolverIncludes');

const REPO_ROOT = path.resolve(__dirname, '../../../../..');
const FRONTEND_DIR = path.resolve(REPO_ROOT, 'frontend');
const ROOT_NODE_MODULES = path.resolve(REPO_ROOT, 'node_modules');

describe('pnpmResolverIncludes', () => {
  it('matches monaco and @fontsource CSS under the pnpm store', () => {
    const monacoCss = path.join(
      ROOT_NODE_MODULES,
      'monaco-editor/esm/vs/base/browser/ui/actionbar/actionbar.css',
    );
    expect(isVendorCss(monacoCss, FRONTEND_DIR, ROOT_NODE_MODULES)).toBe(true);
  });

  it('matches nested @patternfly CSS under workspace packages', () => {
    const nestedPfCss = path.join(
      ROOT_NODE_MODULES,
      '@odh-dashboard/feature-store/node_modules/@patternfly/react-topology/dist/esm/css/topology-view.css',
    );
    expect(isVendorCss(nestedPfCss, FRONTEND_DIR, ROOT_NODE_MODULES)).toBe(true);
    expect(isPatternFlyCss(nestedPfCss, FRONTEND_DIR, ROOT_NODE_MODULES)).toBe(true);
  });

  it('matches all @patternfly CSS packages under .pnpm paths', () => {
    const quickstartsCss = path.join(
      ROOT_NODE_MODULES,
      '.pnpm/@patternfly+quickstarts@6.5.0/node_modules/@patternfly/quickstarts/dist/quickstarts.min.css',
    );
    expect(isVendorCss(quickstartsCss, FRONTEND_DIR, ROOT_NODE_MODULES)).toBe(true);
    expect(isPatternFlyCss(quickstartsCss, FRONTEND_DIR, ROOT_NODE_MODULES)).toBe(true);
  });

  it('matches font assets under .pnpm paths', () => {
    const fontPath = path.join(
      ROOT_NODE_MODULES,
      '.pnpm/@fontsource+inter@5.3.0/node_modules/@fontsource/inter/files/inter-latin.woff2',
    );
    expect(isFontOrPficonAsset(fontPath)).toBe(true);
  });

  it('matches highlight.js CSS imported by @patternfly/chatbot', () => {
    const highlightCss = path.join(ROOT_NODE_MODULES, 'highlight.js/styles/vs2015.css');
    expect(isVendorCss(highlightCss, FRONTEND_DIR, ROOT_NODE_MODULES)).toBe(true);
  });

  it('does not match unrelated node_modules assets', () => {
    const lodashPath = path.join(ROOT_NODE_MODULES, 'lodash/lodash.js');
    expect(isVendorCss(lodashPath, FRONTEND_DIR, ROOT_NODE_MODULES)).toBe(false);
    expect(isFontOrPficonAsset(lodashPath)).toBe(false);
  });

  it('returns query-core paired with the package react-query install', () => {
    const { tanstackQueryCoreAlias } = require('../pnpmResolverIncludes');
    const genAiDir = path.resolve(REPO_ROOT, 'packages/gen-ai/frontend');
    const alias = tanstackQueryCoreAlias(genAiDir);
    expect(alias['@tanstack/query-core']).toBeDefined();
    const { version } = require(path.join(alias['@tanstack/query-core'], 'package.json'));
    expect(version).toMatch(/^5\./);
  });

  it('returns an empty alias object when query-core is not installed locally', () => {
    const { tanstackQueryCoreAlias } = require('../pnpmResolverIncludes');
    expect(tanstackQueryCoreAlias('/tmp/nonexistent-package')).toEqual({});
  });

  it('returns micromark paired with mdast-util-from-markdown', () => {
    const { micromarkAlias } = require('../pnpmResolverIncludes');
    const genAiDir = path.resolve(REPO_ROOT, 'packages/gen-ai/frontend');
    const alias = micromarkAlias(genAiDir);
    expect(alias.micromark).toBeDefined();
    const { version } = require(path.join(alias.micromark, 'package.json'));
    expect(version).toMatch(/^4\./);
  });

  it('returns @mui/material and peers from the same install tree', () => {
    const { muiMaterialPeerAliases } = require('../pnpmResolverIncludes');
    const genAiDir = path.resolve(REPO_ROOT, 'packages/gen-ai/frontend');
    const alias = muiMaterialPeerAliases(genAiDir);
    expect(alias['@mui/material']).toBeDefined();
    expect(alias['@mui/utils']).toBeDefined();
    const { version } = require(path.join(alias['@mui/material'], 'package.json'));
    expect(version).toMatch(/^7\./);
  });

  it('returns mod-arch-core and mod-arch-shared from the same install tree', () => {
    const { modArchAliases } = require('../pnpmResolverIncludes');
    const genAiDir = path.resolve(REPO_ROOT, 'packages/gen-ai/frontend');
    const alias = modArchAliases(genAiDir);
    expect(alias['mod-arch-core']).toBeDefined();
    expect(alias['mod-arch-shared']).toBeDefined();
    const { version } = require(path.join(alias['mod-arch-core'], 'package.json'));
    expect(version).toMatch(/^1\./);
  });
});
