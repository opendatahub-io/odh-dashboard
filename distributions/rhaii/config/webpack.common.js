const path = require('path');
const webpack = require('webpack');
const { merge } = require('webpack-merge');
const createWebpackCommon = require('../../base/config/webpack.common.js');
const GenerateDistributionExtensionsPlugin = require('../../base/config/generateDistributionExtensionsPlugin');

const SRC_DIR = path.resolve(__dirname, '../src');
const REPO_ROOT = path.resolve(__dirname, '../../..');
const TITLE = 'RHAII';

const additionalIncludes = [];
if (process.env.ENABLE_MODEL_SERVING === 'true') {
  additionalIncludes.push(path.resolve(REPO_ROOT, 'packages/model-serving'));
  additionalIncludes.push(path.resolve(REPO_ROOT, 'packages/k8s-core'));
  additionalIncludes.push(path.resolve(REPO_ROOT, 'packages/model-registry'));
  additionalIncludes.push(path.resolve(REPO_ROOT, 'packages/ui-core'));
  additionalIncludes.push(path.resolve(REPO_ROOT, 'packages/hardware-profiles'));
  additionalIncludes.push(path.resolve(REPO_ROOT, 'packages/foundation'));
}

module.exports = (overrides = {}) =>
  merge(
    createWebpackCommon({
      distributionSrcDir: SRC_DIR,
      title: TITLE,
      additionalIncludes,
      ...overrides,
    }),
    {
      plugins: [
        // RHAII-specific process.env overrides. Cross-distribution vars
        // should move to the base app-shell webpack config once
        // frontend/src/utilities/const.ts is decoupled from process.env
        // (see docs/process-env-const-coupling.md).
        new webpack.DefinePlugin({
          'process.env.ODH_PRODUCT_NAME': JSON.stringify('RHAII'),
          'process.env.BACKEND_PORT': JSON.stringify('4000'),
          'process.env': '({})',
        }),
        new GenerateDistributionExtensionsPlugin({
          configPath: path.resolve(__dirname, '../distribution.yaml'),
          targetFile: path.join(SRC_DIR, 'distribution-extensions.ts'),
          envOverrides: {
            ENABLE_MODEL_SERVING: {
              package: '@odh-dashboard/model-serving',
              extensionsPath: './extensions',
              featureFlags: { 'model-serving-shell': true },
            },
          },
        }),
      ],
    },
  );
