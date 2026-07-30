/* eslint-disable prefer-destructuring, @typescript-eslint/restrict-template-expressions */
const path = require('path');
const { execSync } = require('child_process');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const { rspack } = require('@rspack/core');
const { setupWebpackDotenvFilesForEnv } = require('./dotenv');
const GenerateExtensionsPlugin = require('./generateExtensionsPlugin');
const { moduleFederationPlugins, moduleFederationConfig } = require('./moduleFederation');
const { getPluginPackageDetails } = require('./discoverPluginPackages');
const { getExtensionChunksFilter, getPluginChunkName } = require('./pluginChunking');

const RELATIVE_DIRNAME = process.env._ODH_RELATIVE_DIRNAME;
const IS_PROJECT_ROOT_DIR = process.env._ODH_IS_PROJECT_ROOT_DIR;
const IMAGES_DIRNAME = process.env._ODH_IMAGES_DIRNAME;
const PUBLIC_PATH = process.env._ODH_PUBLIC_PATH;
const SRC_DIR = process.env._ODH_SRC_DIR;
const COMMON_DIR = process.env._ODH_COMMON_DIR;
const DIST_DIR = process.env._ODH_DIST_DIR;
const OUTPUT_ONLY = process.env._ODH_OUTPUT_ONLY;
const ODH_FAVICON = process.env.ODH_FAVICON;
const ODH_PRODUCT_NAME = process.env.ODH_PRODUCT_NAME;
const COVERAGE = process.env.COVERAGE;
const MF_DEV = process.env.MF_DEV;

let COMMIT_HASH_DIRECT;

try {
  COMMIT_HASH_DIRECT = execSync('git rev-parse --short HEAD').toString().trim();
} catch (error) {
  console.warn('Unable to get git commit hash:', error.message);
  COMMIT_HASH_DIRECT = 'unknown';
}

const pluginPackageDetails = getPluginPackageDetails();

if (pluginPackageDetails.length === 0) {
  console.warn(
    'Warning: No plugin packages discovered. The pluginChunks splitChunks group will have no effect. ' +
      'Check that workspace packages have ./extensions exports and that npm query is working.',
  );
}

if (OUTPUT_ONLY !== 'true') {
  console.info(
    `\nPrepping files...\n  SRC DIR: ${SRC_DIR}\n  OUTPUT DIR: ${DIST_DIR}\n  PUBLIC PATH: ${PUBLIC_PATH}\n`,
  );
  console.info(
    'Plugin chunk groups:',
    pluginPackageDetails.map((p) => p.shortName),
  );
  if (COVERAGE === 'true') {
    console.info('\nAdding code coverage instrumentation.\n');
  }
}

module.exports = (env) => ({
  entry: {
    app: path.join(SRC_DIR, 'index.tsx'),
  },
  module: {
    rules: [
      {
        test: /\.(tsx|ts|jsx|js)?$/,
        exclude: [/node_modules\/(?!@odh-dashboard)/, /__tests__/, /__mocks__/],
        include: [
          SRC_DIR,
          COMMON_DIR,
          path.resolve(RELATIVE_DIRNAME, '../packages'),
          path.resolve(RELATIVE_DIRNAME, '../plugins'),
        ],
        use: [
          COVERAGE === 'true' && '@jsdevtools/coverage-istanbul-loader',
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
        ].filter(Boolean),
      },
      {
        test: /\.(svg|ttf|eot|woff|woff2)$/,
        include: [
          path.resolve(RELATIVE_DIRNAME, '../node_modules/patternfly/dist/fonts'),
          path.resolve(
            RELATIVE_DIRNAME,
            '../node_modules/@patternfly/react-core/dist/styles/assets/fonts',
          ),
          path.resolve(
            RELATIVE_DIRNAME,
            '../node_modules/@patternfly/react-core/dist/styles/assets/pficon',
          ),
          path.resolve(RELATIVE_DIRNAME, '../node_modules/@patternfly/patternfly/assets/fonts'),
          path.resolve(RELATIVE_DIRNAME, '../node_modules/@patternfly/patternfly/assets/pficon'),
          path.resolve(RELATIVE_DIRNAME, '../node_modules/monaco-editor'),
          path.resolve(RELATIVE_DIRNAME, '../node_modules/@fontsource'),
        ],
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name][ext]',
        },
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
        include: (input) => input.indexOf(IMAGES_DIRNAME) > -1,
        type: 'asset',
        parser: {
          dataUrlCondition: { maxSize: 10000 },
        },
        generator: {
          filename: 'images/[name][ext]',
        },
      },
      {
        test: /\.svg$/,
        include: (input) =>
          input.indexOf(IMAGES_DIRNAME) === -1 &&
          input.indexOf('fonts') === -1 &&
          input.indexOf('background-filter') === -1 &&
          input.indexOf('pficon') === -1,
        type: 'asset/source',
      },
      {
        test: /\.(jpg|jpeg|png|gif)$/i,
        include: [
          SRC_DIR,
          COMMON_DIR,
          path.resolve(RELATIVE_DIRNAME, '../node_modules/patternfly'),
          path.resolve(RELATIVE_DIRNAME, '../node_modules/@patternfly/patternfly/assets/images'),
          path.resolve(
            RELATIVE_DIRNAME,
            '../node_modules/@patternfly/react-styles/css/assets/images',
          ),
          path.resolve(
            RELATIVE_DIRNAME,
            '../node_modules/@patternfly/react-core/dist/styles/assets/images',
          ),
          path.resolve(
            RELATIVE_DIRNAME,
            '../node_modules/@patternfly/react-core/node_modules/@patternfly/react-styles/css/assets/images',
          ),
          path.resolve(
            RELATIVE_DIRNAME,
            '../node_modules/@patternfly/react-table/node_modules/@patternfly/react-styles/css/assets/images',
          ),
          path.resolve(
            RELATIVE_DIRNAME,
            '../node_modules/@patternfly/react-inline-edit-extension/node_modules/@patternfly/react-styles/css/assets/images',
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
      {
        test: /\.css$/i,
        use: [
          env === 'production' ? rspack.CssExtractRspackPlugin.loader : 'style-loader',
          'css-loader',
        ],
      },
      {
        test: /\.ya?ml$/,
        use: 'js-yaml-loader',
      },
    ],
  },
  output: {
    filename: '[name].js',
    path: DIST_DIR,
    publicPath: PUBLIC_PATH,
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        pluginChunks: {
          test(module) {
            return pluginPackageDetails.some(
              (pkg) => module.resource && module.resource.startsWith(`${pkg.location}/`),
            );
          },
          name: getPluginChunkName(pluginPackageDetails),
          chunks: getExtensionChunksFilter(pluginPackageDetails),
          enforce: true,
          priority: 10,
        },
      },
    },
  },
  plugins: [
    // Virtually override the stub with discovered package extension imports.
    new GenerateExtensionsPlugin({
      modulePath: path.join(SRC_DIR, 'plugins', 'plugin-extensions.ts'),
    }),
    ...setupWebpackDotenvFilesForEnv({
      directory: RELATIVE_DIRNAME,
      isRoot: IS_PROJECT_ROOT_DIR,
    }),
    new HtmlWebpackPlugin({
      template: path.join(SRC_DIR, 'index.html'),
      title: ODH_PRODUCT_NAME,
      favicon: path.join(SRC_DIR, 'images', ODH_FAVICON),
    }),
    new rspack.CopyRspackPlugin({
      patterns: [
        {
          from: path.join(SRC_DIR, 'locales'),
          to: path.join(DIST_DIR, 'locales'),
          noErrorOnMissing: true,
        },
        {
          from: path.join(SRC_DIR, 'favicons'),
          to: path.join(DIST_DIR, 'favicons'),
          noErrorOnMissing: true,
        },
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
        {
          from: path.join(SRC_DIR, 'favicon.png'),
          to: path.join(DIST_DIR),
          noErrorOnMissing: true,
        },
        {
          from: path.join(SRC_DIR, 'manifest.json'),
          to: path.join(DIST_DIR),
          noErrorOnMissing: true,
        },
        {
          from: path.join(SRC_DIR, 'robots.txt'),
          to: path.join(DIST_DIR),
          noErrorOnMissing: true,
        },
      ],
    }),
    new MonacoWebpackPlugin({
      languages: ['yaml'],
    }),
    new rspack.DefinePlugin({
      __COMMIT_HASH__: JSON.stringify(COMMIT_HASH_DIRECT),
    }),
    env === 'development' || MF_DEV
      ? new rspack.EnvironmentPlugin({
          MF_REMOTES: JSON.stringify(
            moduleFederationConfig
              .filter((c) => !!c.backend)
              .map((c) => ({ name: c.name, remoteEntry: c.backend.remoteEntry })),
          ),
        })
      : undefined,
    ...moduleFederationPlugins,
  ],
  resolve: {
    extensions: ['.js', '.ts', '.tsx', '.jsx'],
    symlinks: true,
    cacheWithContext: false,
  },
});
