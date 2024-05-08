const { execSync } = require('child_process');
const path = require('path');
const { merge } = require('webpack-merge');
const { setupWebpackDotenvFilesForEnv, setupDotenvFilesForEnv } = require('./dotenv');

setupDotenvFilesForEnv({ env: 'development' });
const webpackCommon = require('./webpack.common.js');

const RELATIVE_DIRNAME = process.env._ODH_RELATIVE_DIRNAME;
const IS_PROJECT_ROOT_DIR = process.env._ODH_IS_PROJECT_ROOT_DIR;
const SRC_DIR = process.env._ODH_SRC_DIR;
const COMMON_DIR = process.env._ODH_COMMON_DIR;
const DIST_DIR = process.env._ODH_DIST_DIR;
const HOST = process.env._ODH_HOST;
const PORT = process.env._ODH_PORT;
const BACKEND_PORT = process.env._BACKEND_PORT;

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
  webpackCommon('development'),
  {
    mode: 'development',
    devtool: 'eval-source-map',
    devServer: {
      host: HOST,
      port: PORT,
      compress: true,
      historyApiFallback: true,
      hot: true,
      open: false,
      proxy: (() => {
        if (process.env.EXT_CLUSTER) {
          const odhProject = process.env.OC_PROJECT || 'opendatahub';
          const app = process.env.ODH_APP || 'odh-dashboard';
          console.info('Using project:', odhProject);

          let dashboardHost;
          let token;
          try {
            try {
              dashboardHost = execSync(
                `oc get routes -n ${odhProject} ${app} -o jsonpath='{.spec.host}'`,
              )
                .toString()
                .trim();
            } catch (e) {
              console.info('Failed to GET dashboard route, constructing host manually.');
              dashboardHost = new URL(execSync(`oc whoami --show-server`).toString()).host
                .replace(/:\d+$/, '')
                .replace(/^api./, `${app}-${odhProject}.apps.`);
            }
            console.info('Dashboard host:', dashboardHost);

            token = execSync('oc whoami --show-token').toString().trim();

            const username = execSync('oc whoami').toString().trim();
            console.info('Logged in as user:', username);
          } catch (e) {
            console.error('Login with `oc login` prior to starting dev server.');
            process.exit(1);
          }

          const headers = {
            Authorization: `Bearer ${token}`,
            'x-forwarded-access-token': token,
          };

          return {
            '/api': {
              target: `https://${dashboardHost}`,
              secure: false,
              changeOrigin: true,
              headers,
            },
            '/wss': {
              target: `wss://${dashboardHost}`,
              ws: true,
              secure: false,
              changeOrigin: true,
              headers,
            },
          };
        } else {
          return {
            '/api': `http://0.0.0.0:${BACKEND_PORT}`,
            '/wss': {
              target: `ws://0.0.0.0:${BACKEND_PORT}`,
              ws: true,
            },
          };
        }
      })(),
      devMiddleware: {
        stats: 'errors-only',
      },
      client: {
        overlay: false,
      },
      static: {
        directory: DIST_DIR,
      },
      onListening: (devServer) => {
        if (devServer) {
          console.log(
            `\x1b[32m✓ ODH Dashboard available at: \x1b[4mhttp://localhost:${
              devServer.server.address().port
            }\x1b[0m`,
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
            path.resolve(RELATIVE_DIRNAME, 'node_modules/monaco-editor'),
          ],
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
  },
);
