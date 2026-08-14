/* eslint-disable no-console */
const path = require('path');
const { merge } = require('rspack-merge');
const { rspack } = require('@rspack/core');
const { RsdoctorRspackPlugin } = require('@rsdoctor/rspack-plugin');
const { setupWebpackDotenvFilesForEnv, setupDotenvFilesForEnv } = require('./dotenv');

setupDotenvFilesForEnv({ env: 'production' });
const rspackCommon = require('./rspack.common.js');

const RELATIVE_DIRNAME = process.env._RELATIVE_DIRNAME;
const IS_PROJECT_ROOT_DIR = process.env._IS_PROJECT_ROOT_DIR === 'true';
const SRC_DIR = process.env._SRC_DIR;
const COMMON_DIR = process.env._COMMON_DIR;
const DIST_DIR = process.env._DIST_DIR;
const OUTPUT_ONLY = process.env._OUTPUT_ONLY;
const ROOT_NODE_MODULES = path.resolve(RELATIVE_DIRNAME, '../../../node_modules');

if (OUTPUT_ONLY !== 'true') {
  console.info(`Cleaning OUTPUT DIR...\n  ${DIST_DIR}\n`);
}

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
  rspackCommon('production'),
  {
    mode: 'production',
    devtool: 'source-map',
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
      // Only enable when analyzing — increases build time.
      // See https://rspack.rs/guide/optimization/use-rsdoctor
      process.env.RSDOCTOR === 'true' && new RsdoctorRspackPlugin(),
    ].filter(Boolean),
    module: {
      rules: [
        {
          test: /\.css$/,
          include: [
            SRC_DIR,
            COMMON_DIR,
            path.resolve(RELATIVE_DIRNAME, 'node_modules/@patternfly'),
            path.resolve(ROOT_NODE_MODULES, '@patternfly'),
          ],
          use: [rspack.CssExtractRspackPlugin.loader, 'css-loader'],
        },
      ],
    },
  },
);
