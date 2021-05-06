const path = require('path');
const { merge } = require('webpack-merge');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const TerserJSPlugin = require('terser-webpack-plugin');
const rimraf = require('rimraf');
const { setupWebpackDotenvFilesForEnv, setupDotenvFilesForEnv } = require('./dotenv');

setupDotenvFilesForEnv({ env: 'production' });
const webpackCommon = require('./webpack.common.js');

const RELATIVE_DIRNAME = process.env._ODH_RELATIVE_DIRNAME;
const IS_PROJECT_ROOT_DIR = process.env._ODH_IS_PROJECT_ROOT_DIR;
const SRC_DIR = process.env._ODH_SRC_DIR;
const COMMON_DIR = process.env._ODH_COMMON_DIR;
const DIST_DIR = process.env._ODH_DIST_DIR;
const OUTPUT_ONLY = process.env._ODH_OUTPUT_ONLY;

if (OUTPUT_ONLY !== true) {
  console.info(`Cleaning OUTPUT DIR...\n  ${DIST_DIR}\n`);
}

rimraf(DIST_DIR, () => {});

module.exports = merge(
  {
    plugins: [
      ...setupWebpackDotenvFilesForEnv({ directory: RELATIVE_DIRNAME, env: 'production', isRoot: IS_PROJECT_ROOT_DIR })
    ]
  },
  webpackCommon('production'),
  {
    mode: 'production',
    devtool: 'source-map',
    optimization: {
      minimizer: [new TerserJSPlugin({}), new OptimizeCSSAssetsPlugin({})]
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: '[name].css',
        chunkFilename: '[name].bundle.css'
      })
    ],
    module: {
      rules: [
        {
          test: /\.css$/,
          include: [
            SRC_DIR,
            COMMON_DIR,
            path.resolve(RELATIVE_DIRNAME, 'node_modules/patternfly'),
            path.resolve(RELATIVE_DIRNAME, 'node_modules/@patternfly/patternfly'),
            path.resolve(RELATIVE_DIRNAME, 'node_modules/@patternfly/react-catalog-view-extension'),
            path.resolve(RELATIVE_DIRNAME, 'node_modules/@patternfly/react-styles/css'),
            path.resolve(RELATIVE_DIRNAME, 'node_modules/@patternfly/react-core/dist/styles/base.css'),
            path.resolve(RELATIVE_DIRNAME, 'node_modules/@patternfly/react-core/dist/esm/@patternfly/patternfly'),
            path.resolve(RELATIVE_DIRNAME, 'node_modules/@cloudmosaic/quickstarts')
          ],
          use: [MiniCssExtractPlugin.loader, 'css-loader']
        },
        {
          test: /\.css$/,
          include: stylesheet => stylesheet.includes('@patternfly/react-styles/css/'),
          use: ['null-loader']
        }
      ]
    }
  }
);
