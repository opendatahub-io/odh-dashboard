const { execSync } = require('child_process');
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
const IS_PROJECT_ROOT_DIR = process.env._IS_PROJECT_ROOT_DIR;
const DIST_DIR = process.env._DIST_DIR;
const PUBLIC_PATH = process.env._PUBLIC_PATH;
const AUTH_METHOD = process.env._AUTH_METHOD;

const getProxyHeaders = () => {
  if (AUTH_METHOD === 'user_token') {
    try {
      const token = execSync('oc whoami --show-token').toString().trim();
      const username = execSync('oc whoami').toString().trim();
      // eslint-disable-next-line no-console
      console.info('Logged in as user:', username);
      return {
        Authorization: `Bearer ${token}`,
        'x-forwarded-access-token': token,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get Kubernetes token:', error.message);
      return {};
    }
  }
  return {};
};

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
          context: ['/api', '/gen-ai/api'],
          target: {
            host: PROXY_HOST,
            port: PROXY_PORT,
            protocol: PROXY_PROTOCOL,
          },
          changeOrigin: true,
          headers: getProxyHeaders(),
        },
      ],
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    plugins: [new ReactRefreshWebpackPlugin({ overlay: false })],
  },
);
