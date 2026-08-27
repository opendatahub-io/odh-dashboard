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

const getProxyHeaders = () => {
  if (AUTH_METHOD === 'user_token') {
    try {
      const token = execSync(
        "kubectl config view --raw --minify --flatten -o jsonpath='{.users[].user.token}'",
      )
        .toString()
        .trim();
      const username = execSync("kubectl auth whoami -o jsonpath='{.status.userInfo.username}'")
        .toString()
        .trim();
      console.info('Logged in as user:', username);
      return {
        Authorization: `Bearer ${token}`,
        'x-forwarded-access-token': token,
      };
    } catch (error) {
      console.error('Failed to get Kubernetes token:', error.message);
      return {};
    }
  }
  return {};
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
            // LOCAL DEV: OpenShell API → port-forwarded relay BFF, translating
            // the dedicated dev header into what the relay expects (mirrors the
            // agent-ops BFF's translation) so no local BFF is needed. Trailing
            // slash so it does NOT catch the SPA route '/openshell-preview'.
            context: ['/openshell/'],
            target: process.env.OPENSHELL_RELAY_URL || 'http://localhost:8081',
            changeOrigin: true,
            // Strip the /openshell prefix so the relay sees its own /api/v1/...
            // (mirrors the agent-ops BFF's director).
            pathRewrite: { '^/openshell': '' },
            onProxyReq: (proxyReq) => {
              const t = proxyReq.getHeader('x-openshell-authorization');
              if (t) {
                proxyReq.setHeader(
                  'x-forwarded-access-token',
                  String(t).replace(/^Bearer\s+/i, ''),
                );
                proxyReq.removeHeader('x-openshell-authorization');
                proxyReq.removeHeader('authorization');
              }
            },
          },
          {
            context: ['/api', '/agent-ops/api', '/healthcheck'],
            target: {
              host: PROXY_HOST,
              protocol: PROXY_PROTOCOL,
              port: PROXY_PORT,
            },
            changeOrigin: true,
            headers: getProxyHeaders(),
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
      // NOTE: no `module.rules` for CSS here — webpack.common.js already has a
      // broad `/\.css$/` rule. Re-declaring one made webpack-merge concatenate
      // both, so PatternFly CSS ran through the loader chain twice
      // (css-loader!style-loader!css-loader) → SyntaxError → blank dev page.
      plugins: [
        new ForkTsCheckerWebpackPlugin(),
        new ReactRefreshWebpackPlugin({ overlay: false }),
      ],
    },
  ),
);
