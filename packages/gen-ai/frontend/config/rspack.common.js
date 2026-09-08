const path = require('path');
const { rspack } = require('@rspack/core');
const Dotenv = require('dotenv-webpack');
const { moduleFederationPlugins } = require('./moduleFederation');

const BG_IMAGES_DIRNAME = 'bgimages';
const { setupWebpackDotenvFilesForEnv } = require('./dotenv');

const { name } = require('../package.json');

const SRC_DIR = process.env._SRC_DIR;
const DIST_DIR = process.env._DIST_DIR;
const COMMON_DIR = process.env._COMMON_DIR;
const RELATIVE_DIRNAME = process.env._RELATIVE_DIRNAME;
const IS_PROJECT_ROOT_DIR = process.env._IS_PROJECT_ROOT_DIR;

module.exports = (env) => ({
  entry: {
    app: path.join(SRC_DIR, 'index.ts'),
  },
  module: {
    rules: [
      {
        test: /\.(tsx|ts|jsx)?$/,
        exclude: [/node_modules\/(?!@odh-dashboard)/, /__tests__/, /__mocks__/],
        use: [
          {
            loader: 'builtin:swc-loader',
            options: {
              detectSyntax: 'auto',
              jsc: {
                transform: {
                  react: {
                    runtime: 'classic',
                    refresh: env === 'development',
                  },
                },
              },
            },
          },
        ],
      },
      {
        test: /\.(svg|ttf|eot|woff|woff2)$/,
        type: 'asset/resource',
        // only process modules with this loader
        // if they live under a 'fonts' or 'pficon' directory
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
        ],
      },
      {
        test: /\.svg$/,
        include: (input) => input.indexOf('background-filter.svg') > 1,
        type: 'asset',
        parser: {
          dataUrlCondition: { maxSize: 5000 },
        },
        generator: {
          filename: 'svgs/[name][ext]',
        },
      },
      {
        test: /\.svg$/,
        // only process SVG modules with this loader if they live under a 'bgimages' directory
        // this is primarily useful when applying a CSS background using an SVG
        include: (input) => input.indexOf(BG_IMAGES_DIRNAME) > -1,
        type: 'asset/inline',
      },
      {
        test: /\.svg$/,
        // only process SVG modules with this loader when they don't live under a 'bgimages',
        // 'fonts', or 'pficon' directory, those are handled with other loaders
        include: (input) =>
          input.indexOf(BG_IMAGES_DIRNAME) === -1 &&
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
          COMMON_DIR,
          path.resolve(RELATIVE_DIRNAME, 'src'),
          path.resolve(RELATIVE_DIRNAME, 'node_modules/patternfly'),
          path.resolve(RELATIVE_DIRNAME, 'node_modules/@patternfly/patternfly/assets/images'),
          path.resolve(RELATIVE_DIRNAME, 'node_modules/@patternfly/react-styles/css/assets/images'),
          path.resolve(
            RELATIVE_DIRNAME,
            'node_modules/@patternfly/react-core/dist/styles/assets/images',
          ),
          path.resolve(
            RELATIVE_DIRNAME,
            'node_modules/@patternfly/react-core/node_modules/@patternfly/react-styles/css/assets/images',
          ),
          path.resolve(
            RELATIVE_DIRNAME,
            'node_modules/@patternfly/react-table/node_modules/@patternfly/react-styles/css/assets/images',
          ),
          path.resolve(
            RELATIVE_DIRNAME,
            'node_modules/@patternfly/react-inline-edit-extension/node_modules/@patternfly/react-styles/css/assets/images',
          ),
        ],
        type: 'asset',
        parser: {
          dataUrlCondition: { maxSize: 5000 },
        },
        generator: {
          filename: 'images/[name][ext]',
        },
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          env === 'production' ? rspack.CssExtractRspackPlugin.loader : 'style-loader',
          'css-loader',
          'sass-loader',
        ],
      },
    ],
  },
  output: {
    filename: '[name].js',
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
    new rspack.HtmlRspackPlugin({
      template: path.resolve(SRC_DIR, 'index.html'),
      chunks: ['app'],
    }),
    new Dotenv({
      systemvars: true,
      silent: true,
    }),
    new rspack.CopyRspackPlugin({
      patterns: [{ from: './src/favicon.png', to: 'images' }],
    }),
  ],
  resolve: {
    extensions: ['.js', '.ts', '.tsx', '.jsx'],
    alias: {
      '~': path.resolve(SRC_DIR),
    },
    symlinks: false,
    cacheWithContext: false,
  },
});
