const path = require('path');
const { rspack } = require('@rspack/core');
const { OdhFederationPlugin } = require('@odh-dashboard/app-config/rspack');
const { merge } = require('rspack-merge');
const createRspackCommon = require('../../base/config/rspack.common.js');
const GenerateDistributionExtensionsPlugin = require('../../base/config/generateDistributionExtensionsPlugin.js');

const SRC_DIR = path.resolve(__dirname, '../src');
const TITLE = 'RHAII';

if (process.env.MODEL_SERVING_REMOTE_ENTRY && process.env.ENABLE_MODEL_SERVING === 'true') {
  throw new Error('MODEL_SERVING_REMOTE_ENTRY and ENABLE_MODEL_SERVING cannot be enabled together');
}
const REPO_ROOT = path.resolve(__dirname, '../../..');

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
          // codeEditor → monaco-editor (codicon.ttf, etc.)
          {
            test: /\.(svg|ttf|eot|woff|woff2)$/,
            include: [
              path.resolve(REPO_ROOT, 'node_modules/monaco-editor'),
              path.resolve(REPO_ROOT, 'node_modules/@fontsource'),
            ],
            type: 'asset/resource',
            generator: {
              filename: 'fonts/[name][ext]',
            },
          },
        ],
      },
      plugins: [
        new OdhFederationPlugin({
          name: 'host',
          isHost: true,
          remotes: process.env.MODEL_SERVING_REMOTE_ENTRY
            ? {
                modelServing: `modelServing@${process.env.MODEL_SERVING_REMOTE_ENTRY}`,
              }
            : undefined,
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
        }),
      ],
    },
  );
