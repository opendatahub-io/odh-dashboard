const path = require('path');
const webpack = require('webpack');
const { merge } = require('webpack-merge');
const createWebpackCommon = require('../../base/config/webpack.common.js');
const GenerateDistributionExtensionsPlugin = require('../../base/config/generateDistributionExtensionsPlugin');

const SRC_DIR = path.resolve(__dirname, '../src');
const TITLE = 'RHAII';

module.exports = (overrides = {}) =>
  merge(
    createWebpackCommon({
      distributionSrcDir: SRC_DIR,
      title: TITLE,
      ...overrides,
    }),
    {
      plugins: [
        new webpack.DefinePlugin({
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
