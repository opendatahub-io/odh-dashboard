const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { isFontOrPficonAsset, isPatternFlyCss, isVendorCss } = require('../pnpmResolverIncludes');

const FRONTEND_DIR = path.resolve(__dirname, '../../../frontend');
const ROOT_NODE_MODULES = path.resolve(FRONTEND_DIR, '../node_modules');

describe('pnpmResolverIncludes', () => {
  it('matches monaco and @fontsource CSS under the pnpm store', () => {
    const monacoCss = path.join(
      ROOT_NODE_MODULES,
      'monaco-editor/esm/vs/base/browser/ui/actionbar/actionbar.css',
    );
    assert.equal(isVendorCss(monacoCss, FRONTEND_DIR, ROOT_NODE_MODULES), true);
  });

  it('matches nested @patternfly CSS under workspace packages', () => {
    const nestedPfCss = path.join(
      ROOT_NODE_MODULES,
      '@odh-dashboard/feature-store/node_modules/@patternfly/react-topology/dist/esm/css/topology-view.css',
    );
    assert.equal(isVendorCss(nestedPfCss, FRONTEND_DIR, ROOT_NODE_MODULES), true);
    assert.equal(isPatternFlyCss(nestedPfCss, FRONTEND_DIR, ROOT_NODE_MODULES), true);
  });

  it('matches font assets under .pnpm paths', () => {
    const fontPath = path.join(
      ROOT_NODE_MODULES,
      '.pnpm/@fontsource+inter@5.3.0/node_modules/@fontsource/inter/files/inter-latin.woff2',
    );
    assert.equal(isFontOrPficonAsset(fontPath), true);
  });

  it('matches highlight.js CSS imported by @patternfly/chatbot', () => {
    const highlightCss = path.join(ROOT_NODE_MODULES, 'highlight.js/styles/vs2015.css');
    assert.equal(isVendorCss(highlightCss, FRONTEND_DIR, ROOT_NODE_MODULES), true);
  });

  it('does not match unrelated node_modules assets', () => {
    const lodashPath = path.join(ROOT_NODE_MODULES, 'lodash/lodash.js');
    assert.equal(isVendorCss(lodashPath, FRONTEND_DIR, ROOT_NODE_MODULES), false);
    assert.equal(isFontOrPficonAsset(lodashPath), false);
  });

  it('returns query-core paired with the package react-query install', () => {
    const { tanstackQueryCoreAlias } = require('../pnpmResolverIncludes');
    const genAiDir = path.resolve(__dirname, '../../../packages/gen-ai/frontend');
    const alias = tanstackQueryCoreAlias(genAiDir);
    assert.ok(alias['@tanstack/query-core']);
    const version = require(path.join(alias['@tanstack/query-core'], 'package.json')).version;
    assert.match(version, /^5\./);
  });

  it('returns an empty alias object when query-core is not installed locally', () => {
    const { tanstackQueryCoreAlias } = require('../pnpmResolverIncludes');
    assert.deepEqual(tanstackQueryCoreAlias('/tmp/nonexistent-package'), {});
  });
});
