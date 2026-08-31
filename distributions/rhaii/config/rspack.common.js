const path = require('path');
const { rspack } = require('@rspack/core');
const { OdhFederationPlugin } = require('@odh-dashboard/app-config/rspack');
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
        new OdhFederationPlugin({
          name: 'rhaiiHost',
          isHost: true,
          remotes: process.env.MODEL_SERVING_REMOTE_ENTRY
            ? {
                modelServing: `modelServing@${process.env.MODEL_SERVING_REMOTE_ENTRY}`,
              }
            : undefined,
          shared: {
            '@odh-dashboard/ui-core': {
              singleton: true,
              requiredVersion: '*',
              eager: true,
            },
            '@openshift/dynamic-plugin-sdk-utils': {
              singleton: true,
              requiredVersion: '^5.0.0',
              eager: true,
            },
          },
          dts: false,
        }),
        new rspack.DefinePlugin({
          'process.env.ODH_PRODUCT_NAME': JSON.stringify('RHAII'),
          'process.env.BACKEND_PORT': JSON.stringify('4000'),
          'process.env.MODEL_SERVING_REMOTE_ENTRY': JSON.stringify(
            process.env.MODEL_SERVING_REMOTE_ENTRY || '',
          ),
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
