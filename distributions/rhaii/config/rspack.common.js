const path = require('path');
const { rspack } = require('@rspack/core');
const { merge } = require('rspack-merge');
const createRspackCommon = require('../../base/config/rspack.common.js');
const GenerateDistributionExtensionsPlugin = require('../../base/config/generateDistributionExtensionsPlugin.js');

const SRC_DIR = path.resolve(__dirname, '../src');
const TITLE = 'RHAII';

module.exports = (overrides = {}) =>
  merge(
    createRspackCommon({
      distributionSrcDir: SRC_DIR,
      title: TITLE,
      ...overrides,
    }),
    {
      plugins: [
        new rspack.DefinePlugin({
          'process.env.ODH_PRODUCT_NAME': JSON.stringify('RHAII'),
          'process.env.BACKEND_PORT': JSON.stringify('4000'),
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
