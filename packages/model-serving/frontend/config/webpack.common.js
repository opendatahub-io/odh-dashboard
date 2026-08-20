/* eslint-disable no-console */
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const { moduleFederationPlugins } = require('./moduleFederation');
const { setupWebpackDotenvFilesForEnv } = require('./dotenv');
const { name } = require('../package.json');

const RELATIVE_DIRNAME = process.env._RELATIVE_DIRNAME;
const IS_PROJECT_ROOT_DIR = process.env._IS_PROJECT_ROOT_DIR === 'true';
const IMAGES_DIRNAME = process.env._IMAGES_DIRNAME;
const PUBLIC_PATH = process.env._PUBLIC_PATH;
const SRC_DIR = process.env._SRC_DIR;
const COMMON_DIR = process.env._COMMON_DIR;
const DIST_DIR = process.env._DIST_DIR;
const PACKAGE_SRC_DIR = path.resolve(RELATIVE_DIRNAME, '../src');
const ROOT_NODE_MODULES = path.resolve(RELATIVE_DIRNAME, '../../../node_modules');
const { _OUTPUT_ONLY: OUTPUT_ONLY, PRODUCT_NAME, COVERAGE } = process.env;
const BASE_PATH = PUBLIC_PATH;

if (OUTPUT_ONLY !== 'true') {
  console.info(
    `\nPrepping files...\n  SRC DIR: ${SRC_DIR}\n  OUTPUT DIR: ${DIST_DIR}\n  PUBLIC PATH: ${PUBLIC_PATH}\n  BASE_PATH: ${BASE_PATH}\n`,
  );
  if (COVERAGE === 'true') {
    console.info('\nAdding code coverage instrumentation.\n');
  }
}

module.exports = () => ({
  entry: {
    app: path.join(SRC_DIR, 'index.ts'),
  },
  module: {
    rules: [
      {
        test: /\.(tsx|ts|jsx|js)?$/,
        exclude: [/node_modules\/(?!@odh-dashboard)/, /__tests__/, /__mocks__/, /cypress/],
        use: [
          COVERAGE === 'true' && '@jsdevtools/coverage-istanbul-loader',
          { loader: 'swc-loader' },
        ].filter(Boolean),
      },
      {
        test: /\.(svg|ttf|eot|woff|woff2)$/,
        include: [
          path.resolve(RELATIVE_DIRNAME, 'node_modules/patternfly/dist/fonts'),
          path.resolve(
            RELATIVE_DIRNAME,
            'node_modules/@patternfly/react-core/dist/styles/assets/fonts',
          ),
          path.resolve(
            RELATIVE_DIRNAME,
            'node_modules/@patternfly/react-core/dist/styles/assets/pficon',
          ),
          path.resolve(RELATIVE_DIRNAME, 'node_modules/@patternfly/patternfly/assets/fonts'),
          path.resolve(RELATIVE_DIRNAME, 'node_modules/@patternfly/patternfly/assets/pficon'),
          path.resolve(ROOT_NODE_MODULES, 'patternfly/dist/fonts'),
          path.resolve(ROOT_NODE_MODULES, '@patternfly/react-core/dist/styles/assets/fonts'),
          path.resolve(ROOT_NODE_MODULES, '@patternfly/react-core/dist/styles/assets/pficon'),
          path.resolve(ROOT_NODE_MODULES, '@patternfly/patternfly/assets/fonts'),
          path.resolve(ROOT_NODE_MODULES, '@patternfly/patternfly/assets/pficon'),
        ],
        use: {
          loader: 'file-loader',
          options: {
            limit: 5000,
            outputPath: 'fonts',
            name: '[name].[ext]',
          },
        },
      },
      {
        test: /\.svg$/,
        include: (input) => input.indexOf('background-filter.svg') > 1,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 5000,
              outputPath: 'svgs',
              name: '[name].[ext]',
            },
          },
        ],
      },
      {
        test: /\.svg$/,
        include: (input) => input.indexOf(IMAGES_DIRNAME) > -1,
        use: {
          loader: 'svg-url-loader',
          options: {
            limit: 10000,
          },
        },
      },
      {
        test: /\.svg$/,
        include: (input) =>
          input.indexOf(IMAGES_DIRNAME) === -1 &&
          input.indexOf('fonts') === -1 &&
          input.indexOf('background-filter') === -1 &&
          input.indexOf('pficon') === -1,
        use: {
          loader: 'raw-loader',
          options: {},
        },
      },
      {
        test: /\.(jpg|jpeg|png|gif)$/i,
        include: [
          SRC_DIR,
          PACKAGE_SRC_DIR,
          COMMON_DIR,
          path.resolve(RELATIVE_DIRNAME, 'node_modules/patternfly'),
          path.resolve(RELATIVE_DIRNAME, 'node_modules/@patternfly/patternfly/assets/images'),
          path.resolve(RELATIVE_DIRNAME, 'node_modules/@patternfly/react-styles/css/assets/images'),
          path.resolve(
            RELATIVE_DIRNAME,
            'node_modules/@patternfly/react-core/dist/styles/assets/images',
          ),
          path.resolve(ROOT_NODE_MODULES, 'patternfly'),
          path.resolve(ROOT_NODE_MODULES, '@patternfly/patternfly/assets/images'),
          path.resolve(ROOT_NODE_MODULES, '@patternfly/react-styles/css/assets/images'),
          path.resolve(ROOT_NODE_MODULES, '@patternfly/react-core/dist/styles/assets/images'),
        ],
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 5000,
              outputPath: 'images',
              name: '[name].[ext]',
            },
          },
        ],
      },
      {
        test: /\.s[ac]ss$/i,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
      {
        test: /\.ya?ml$/,
        use: 'js-yaml-loader',
      },
    ],
  },
  output: {
    filename: '[name].bundle.js',
    path: DIST_DIR,
    publicPath: 'auto',
    uniqueName: name,
  },
  plugins: [
    ...moduleFederationPlugins,
    ...setupWebpackDotenvFilesForEnv({
      directory: RELATIVE_DIRNAME,
      isRoot: IS_PROJECT_ROOT_DIR,
    }),
    new HtmlWebpackPlugin({
      template: path.join(SRC_DIR, 'index.html'),
      title: PRODUCT_NAME,
      publicPath: BASE_PATH,
      base: {
        href: BASE_PATH,
      },
      chunks: ['app'],
    }),
    new CopyPlugin({
      patterns: [
        {
          from: path.join(SRC_DIR, 'images'),
          to: path.join(DIST_DIR, 'images'),
          noErrorOnMissing: true,
        },
        {
          from: path.join(SRC_DIR, 'favicon.ico'),
          to: path.join(DIST_DIR),
          noErrorOnMissing: true,
        },
      ],
    }),
  ],
  resolve: {
    extensions: ['.js', '.ts', '.tsx', '.jsx'],
    alias: {
      '~': path.resolve(SRC_DIR),
      '@odh-dashboard/internal': path.resolve(RELATIVE_DIRNAME, '../../../frontend/src'),
      '#~': path.resolve(RELATIVE_DIRNAME, '../../../frontend/src'),
    },
    symlinks: false,
    cacheWithContext: false,
  },
});
