const path = require('path');
const { rspack } = require('@rspack/core');
const { merge } = require('rspack-merge');
const ContextualTildeResolverPlugin = require('./contextualTildeResolverPlugin');
const createRspackCommon = require('../../base/config/rspack.common.js');
const GenerateDistributionExtensionsPlugin = require('../../base/config/generateDistributionExtensionsPlugin.js');

const SRC_DIR = path.resolve(__dirname, '../src');
const REPO_ROOT = path.resolve(__dirname, '../../..');
const TITLE = 'MaaS Consumer Portal';

const DIST_DIR = path.resolve(__dirname, '..');
const PORTAL_NODE_MODULES = path.resolve(DIST_DIR, 'node_modules');
const SHARED_RUNTIME_ALIASES = {
  react$: require.resolve('react'),
  'react/jsx-runtime$': require.resolve('react/jsx-runtime'),
  'react/jsx-dev-runtime$': require.resolve('react/jsx-dev-runtime'),
  'react-dom$': require.resolve('react-dom'),
  'react-dom/client$': require.resolve('react-dom/client'),
  'react-router$': require.resolve('react-router'),
  'react-router/dom$': require.resolve('react-router/dom'),
  'react-router-dom$': require.resolve('react-router-dom'),
  '@openshift/dynamic-plugin-sdk$': require.resolve('@openshift/dynamic-plugin-sdk'),
  '@openshift/dynamic-plugin-sdk-utils$': require.resolve('@openshift/dynamic-plugin-sdk-utils'),
  '@patternfly/react-core$': require.resolve('@patternfly/react-core'),
  '@patternfly/react-styles$': require.resolve('@patternfly/react-styles'),
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
        // MaaS and GenAI source is statically bundled into this distribution. These match the
        // eager singleton packages in packages/app-config/src/webpack/shared-modules-meta.ts.
        // Other dependencies resolve from their owning package (for example GenAI's Markdown
        // and Monaco dependencies).
        alias: SHARED_RUNTIME_ALIASES,
        modules: [PORTAL_NODE_MODULES, 'node_modules'],
      },
      plugins: [
        new ContextualTildeResolverPlugin(tildeMappings),
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
