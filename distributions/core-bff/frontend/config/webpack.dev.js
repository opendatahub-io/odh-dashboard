/* eslint-disable no-console */
const { execSync } = require('child_process');
const path = require('path');
const { merge } = require('webpack-merge');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const SpeedMeasurePlugin = require('speed-measure-webpack-plugin');
const { setupWebpackDotenvFilesForEnv, setupDotenvFilesForEnv } = require('./dotenv');

const smp = new SpeedMeasurePlugin({ disable: !process.env.MEASURE });

setupDotenvFilesForEnv({ env: 'development' });
const webpackCommon = require('./webpack.common.js');

const RELATIVE_DIRNAME = process.env._RELATIVE_DIRNAME;
const IS_PROJECT_ROOT_DIR = process.env._IS_PROJECT_ROOT_DIR === 'true';
const SRC_DIR = process.env._SRC_DIR;
const COMMON_DIR = process.env._COMMON_DIR;
const PUBLIC_PATH = process.env._PUBLIC_PATH;
const DIST_DIR = process.env._DIST_DIR;
const HOST = process.env._HOST;
const PORT = process.env._PORT;
const PROXY_PROTOCOL = process.env._PROXY_PROTOCOL;
const PROXY_HOST = process.env._PROXY_HOST;
const PROXY_PORT = process.env._PROXY_PORT;
const ROOT_NODE_MODULES = path.resolve(RELATIVE_DIRNAME, '../../../node_modules');
const AUTH_METHOD = process.env._AUTH_METHOD;
const BASE_PATH = PUBLIC_PATH;

const toBearerHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'x-forwarded-access-token': token,
});

const getTokenFromEnv = () => {
  const token = process.env.K8S_TOKEN;
  if (!token) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    console.info('Using K8S_TOKEN from environment, subject:', payload.sub || 'unknown');
  } catch {
    console.info('Using K8S_TOKEN from environment');
  }
  return token;
};

const getTokenFromKubeconfig = () => {
  try {
    const token = execSync(
      "kubectl config view --raw --minify --flatten -o jsonpath='{.users[].user.token}'",
    )
      .toString()
      .trim()
      .replaceAll(/^'|'$/g, '');
    if (!token) {
      console.warn(
        'No bearer token found in kubeconfig (cert-based auth?).',
        'Set K8S_TOKEN to a valid SA token, e.g.:',
        'K8S_TOKEN=$(kubectl create token kind-admin -n kube-system) make dev-start-federated',
      );
      return null;
    }
    try {
      const username = execSync("kubectl auth whoami -o jsonpath='{.status.userInfo.username}'")
        .toString()
        .trim();
      console.info('Logged in as user:', username);
    } catch {
      console.warn('kubectl auth whoami failed; continuing with kubeconfig token');
    }
    return token;
  } catch (error) {
    console.error('Failed to get Kubernetes token:', error.message);
    return null;
  }
};

const getProxyHeaders = () => {
  if (AUTH_METHOD !== 'user_token') {
    return {};
  }
  const token = getTokenFromEnv() || getTokenFromKubeconfig();
  return token ? toBearerHeaders(token) : {};
};

module.exports = smp.wrap(
  merge(
    {
      plugins: [
        ...setupWebpackDotenvFilesForEnv({
          directory: RELATIVE_DIRNAME,
          env: 'development',
          isRoot: IS_PROJECT_ROOT_DIR,
        }),
      ],
    },
    webpackCommon('development'),
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
        compress: true,
        historyApiFallback: true,
        hot: true,
        open: false,
        proxy: [
          {
            context: ['/api', '/core-bff/api'],
            target: `${PROXY_PROTOCOL}://${PROXY_HOST}:${PROXY_PORT}`,
            changeOrigin: true,
            headers: getProxyHeaders(),
            pathRewrite: { '^/core-bff': '' },
          },
          {
            context: ['/wss/k8s', '/core-bff/wss/k8s'],
            target: `${PROXY_PROTOCOL === 'https' ? 'wss' : 'ws'}://${PROXY_HOST}:${PROXY_PORT}`,
            ws: true,
            headers: getProxyHeaders(),
            pathRewrite: { '^/core-bff': '' },
          },
        ],
        devMiddleware: {
          stats: 'errors-only',
        },
        client: {
          overlay: false,
        },
        static: {
          directory: DIST_DIR,
          publicPath: BASE_PATH,
        },
        onListening: (devServer) => {
          if (devServer) {
            console.log(
              `\x1b[32m✓ Dashboard available at: \x1b[4mhttp://localhost:${devServer.server.address().port}\x1b[0m`,
            );
          }
        },
      },
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
            use: ['style-loader', 'css-loader'],
          },
        ],
      },
      plugins: [
        new ForkTsCheckerWebpackPlugin(),
        new ReactRefreshWebpackPlugin({ overlay: false }),
      ],
    },
  ),
);
