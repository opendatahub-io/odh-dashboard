const path = require('path');
const { merge } = require('webpack-merge');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

const { setupWebpackDotenvFilesForEnv, setupDotenvFilesForEnv } = require('./dotenv');

setupDotenvFilesForEnv({ env: 'development' });
const common = require('./webpack.common.js');

const HOST = process.env._HOST;
const PORT = process.env._PORT;
const PROXY_HOST = process.env._PROXY_HOST;
const PROXY_PROTOCOL = process.env._PROXY_PROTOCOL;
const PROXY_PORT = process.env._PROXY_PORT;
const RELATIVE_DIRNAME = process.env._RELATIVE_DIRNAME;
const SRC_DIR = process.env._SRC_DIR;
const COMMON_DIR = process.env._COMMON_DIR;
const IS_PROJECT_ROOT_DIR = process.env._IS_PROJECT_ROOT_DIR;
const DIST_DIR = process.env._DIST_DIR;
const PUBLIC_PATH = process.env._PUBLIC_PATH;

module.exports = merge(
  {
    plugins: [
      ...setupWebpackDotenvFilesForEnv({
        directory: RELATIVE_DIRNAME,
        env: 'development',
        isRoot: IS_PROJECT_ROOT_DIR,
      }),
    ],
  },
  common('development'),
  {
    mode: 'development',
    devtool: 'eval-source-map',
    optimization: {
      runtimeChunk: 'single',
      removeEmptyChunks: true,
    },
    devServer: {
      host: HOST,
      port: PORT,
      hot: true,
      compress: true,
      open: false,
      historyApiFallback: true,
      static: {
        directory: DIST_DIR,
        publicPath: PUBLIC_PATH,
      },
      devMiddleware: {
        stats: 'errors-only',
      },
      client: {
        overlay: false,
      },
      proxy: [
        {
          context: ['/genai', '/llama-stack/genai'],
          target: {
            host: PROXY_HOST,
            port: PROXY_PORT,
            protocol: PROXY_PROTOCOL,
          },
          changeOrigin: true,
        },
      ],
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          include: [
            SRC_DIR,
            COMMON_DIR,
            path.resolve(RELATIVE_DIRNAME, 'node_modules/@patternfly'),
            path.resolve(RELATIVE_DIRNAME, 'node_modules/mod-arch-shared/node_modules/@patternfly'),
          ],
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    plugins: [new ReactRefreshWebpackPlugin({ overlay: false })],
  },
);
