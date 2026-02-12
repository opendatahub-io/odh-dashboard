/* eslint-disable @typescript-eslint/restrict-template-expressions */
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
const { moduleFederationConfig } = require('./moduleFederation');

const RELATIVE_DIRNAME = process.env._ODH_RELATIVE_DIRNAME;
const IS_PROJECT_ROOT_DIR = process.env._ODH_IS_PROJECT_ROOT_DIR;
const SRC_DIR = process.env._ODH_SRC_DIR;
const COMMON_DIR = process.env._ODH_COMMON_DIR;
const DIST_DIR = process.env._ODH_DIST_DIR;
const HOST = process.env._ODH_HOST;
const PORT = process.env._ODH_PORT;
const BACKEND_PORT = process.env._BACKEND_PORT;

const mfProxies = moduleFederationConfig
  .map((config) => config.proxyService?.map((p) => p.path))
  .flat()
  .filter((p) => p);

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
      watchOptions: {
        ignored: [
          '**/node_modules',
          '**/dist',
          '**/public',
          '**/public-cypress',
          '**/coverage',
          '**/jest-coverage',
          '**/.nyc_output',
          '**/upstream',
          '**/__tests__',
        ],
      },
      devServer: {
        host: HOST,
        port: PORT,
        compress: true,
        historyApiFallback: true,
        hot: true,
        open: false,
        proxy: (() => {
          if (process.env.EXT_CLUSTER) {
            // Environment variables:
            // - DEV_LEGACY=true: Forces legacy behavior for oauth-proxy clusters
            //   (uses old subdomain format and sends x-forwarded-access-token header)
            const devLegacy = process.env.DEV_LEGACY === 'true';
            let dashboardHost;
            let token;

            try {
              token = execSync('oc whoami --show-token', { stdio: ['pipe', 'pipe', 'ignore'] })
                .toString()
                .trim();
              const username = execSync('oc whoami', { stdio: ['pipe', 'pipe', 'ignore'] })
                .toString()
                .trim();
              console.info('Logged in as user:', username);
            } catch (e) {
              throw new Error('Login with `oc login` prior to starting dev server.');
            }

            const odhProject = process.env.OC_PROJECT || 'opendatahub';
            const app = process.env.ODH_APP || 'odh-dashboard';
            console.info('Using project:', odhProject);

            // try to get dashboard host from HttpRoute and Gateway
            try {
              // Get the HttpRoute resource as JSON
              const httpRouteJson = execSync(`oc get httproutes -n ${odhProject} ${app} -o json`, {
                stdio: ['pipe', 'pipe', 'ignore'],
              }).toString();
              const httpRoute = JSON.parse(httpRouteJson);

              // Extract parent gateway name and namespace
              const parentRef = httpRoute?.status?.parents?.[0]?.parentRef;
              const gatewayName = parentRef?.name;
              const gatewayNamespace = parentRef?.namespace || odhProject;

              if (gatewayName && gatewayNamespace) {
                // Get the Gateway resource as JSON
                const gatewayJson = execSync(
                  `oc get gateway -n ${gatewayNamespace} ${gatewayName} -o json`,
                  { stdio: ['pipe', 'pipe', 'ignore'] },
                ).toString();
                const gateway = JSON.parse(gatewayJson);

                // Find the listener with name 'https'
                const listeners = gateway?.spec?.listeners || [];
                const httpsListener = listeners.find((listener) => listener.name === 'https');
                if (httpsListener && httpsListener.hostname) {
                  dashboardHost = httpsListener.hostname;
                }
              }
            } catch (e) {
              // ignore
            }

            if (!dashboardHost) {
              // try to get dashboard host from Route
              try {
                dashboardHost = execSync(
                  `oc get routes -n ${odhProject} ${app} -o jsonpath='{.spec.host}'`,
                  { stdio: ['pipe', 'pipe', 'ignore'] },
                )
                  .toString()
                  .trim();
              } catch (e) {
                // ignore
              }
            }

            if (!dashboardHost) {
              // default to legacy behavior if ODH_SUBDOMAIN is not set
              const subdomain = devLegacy ? `${app}-${odhProject}` : `data-science-gateway`;
              console.info(
                `Failed to GET dashboard hostname, constructing hostname using subdomain '${subdomain}'.`,
              );
              if (!devLegacy) {
                console.info(
                  `Use DEV_LEGACY=true to override with legacy behavior. eg. DEV_LEGACY=true`,
                );
              }
              dashboardHost = new URL(
                execSync(`oc whoami --show-console`, {
                  stdio: ['pipe', 'pipe', 'ignore'],
                }).toString(),
              ).host.replace(/^[^.]+\./, `${subdomain}.`);
            }

            console.info('Dashboard host:', dashboardHost);

            let shouldFwdAccessToken = false;
            // Detect if oauth-proxy is being used for legacy compatibility
            try {
              const deploymentJson = execSync(`oc get deployment -n ${odhProject} ${app} -o json`, {
                stdio: ['pipe', 'pipe', 'ignore'],
              }).toString();
              const deployment = JSON.parse(deploymentJson);
              const containers = deployment?.spec?.template?.spec?.containers || [];
              shouldFwdAccessToken = containers.some(
                (container) =>
                  container.name === 'oauth-proxy' || container.image?.includes('oauth-proxy'),
              );
            } catch (e) {
              shouldFwdAccessToken = devLegacy;
              // ignore
            }

            const headers = {
              Authorization: `Bearer ${token}`,
            };
            if (shouldFwdAccessToken) {
              console.info('Supplying x-forwarded-access-token header');
              headers['x-forwarded-access-token'] = token;
            }

            return [
              {
                context: ['/api', '/_mf', '/mlflow', ...mfProxies],
                target: `https://${dashboardHost}`,
                secure: false,
                changeOrigin: true,
                headers,
              },
              {
                context: ['/wss/k8s'],
                target: `wss://${dashboardHost}`,
                secure: false,
                ws: true,
                changeOrigin: true,
                headers,
              },
            ];
          }
          return [
            {
              context: ['/api', '/_mf', '/mlflow', ...mfProxies],
              target: `http://0.0.0.0:${BACKEND_PORT}`,
            },
            {
              context: ['/wss/k8s'],
              target: `ws://0.0.0.0:${BACKEND_PORT}`,
              ws: true,
            },
          ];
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
              path.resolve(RELATIVE_DIRNAME, '../node_modules/@patternfly'),
              path.resolve(RELATIVE_DIRNAME, '../node_modules/monaco-editor'),
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
