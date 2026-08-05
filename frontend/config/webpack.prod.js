/* eslint-disable @typescript-eslint/restrict-template-expressions */
const { merge } = require('webpack-merge');
const { rspack } = require('@rspack/core');
const { rimrafSync } = require('rimraf');
const { setupWebpackDotenvFilesForEnv, setupDotenvFilesForEnv } = require('./dotenv');

setupDotenvFilesForEnv({ env: 'production' });
const webpackCommon = require('./webpack.common.js');

const RELATIVE_DIRNAME = process.env._ODH_RELATIVE_DIRNAME;
const IS_PROJECT_ROOT_DIR = process.env._ODH_IS_PROJECT_ROOT_DIR;
const DIST_DIR = process.env._ODH_DIST_DIR;
const OUTPUT_ONLY = process.env._ODH_OUTPUT_ONLY;

if (OUTPUT_ONLY !== 'true') {
  console.info(`Cleaning OUTPUT DIR...\n  ${DIST_DIR}\n`);
}

rimrafSync(DIST_DIR);

module.exports = merge(
  {
    plugins: [
      ...setupWebpackDotenvFilesForEnv({
        directory: RELATIVE_DIRNAME,
        env: 'production',
        isRoot: IS_PROJECT_ROOT_DIR,
      }),
    ],
  },
  webpackCommon('production'),
  {
    mode: 'production',
    devtool: 'source-map',
    // Rspack 2 defaults omit assets/modules from stats JSON; enable them for
    // `build:bundle-profile` / webpack-bundle-analyzer (`_ODH_OUTPUT_ONLY=true`).
    ...(OUTPUT_ONLY === 'true'
      ? {
          stats: {
            all: false,
            ids: true,
            assets: true,
            chunks: true,
            modules: true,
            entrypoints: true,
            chunkGroups: true,
            reasons: true,
          },
        }
      : {}),
    output: {
      filename: '[name].[contenthash].js',
    },
    optimization: {
      minimize: true,
      minimizer: [
        new rspack.SwcJsMinimizerRspackPlugin(),
        new rspack.LightningCssMinimizerRspackPlugin(),
      ],
    },
    plugins: [
      new rspack.CssExtractRspackPlugin({
        filename: '[name].[contenthash].css',
        ignoreOrder: true,
      }),
    ],
  },
);
