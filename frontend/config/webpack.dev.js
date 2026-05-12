/* eslint-disable @typescript-eslint/restrict-template-expressions */
const { execFileSync, execSync, spawn } = require('child_process');
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
            // - ODH_DASHBOARD_HOST: Explicit dashboard hostname (bypasses oc get routes)
            // - DEV_LEGACY=true: Forces legacy behavior for oauth-proxy clusters
            //   (uses old subdomain format and sends x-forwarded-access-token header)
            const devLegacy = process.env.DEV_LEGACY === 'true';
            let dashboardHost = process.env.ODH_DASHBOARD_HOST;
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

            // Token refresh mechanism (for when oc user is switched during tests)
            // Gated behind ODH_TOKEN_REFRESH to avoid unexpected user switches in local dev
            let cachedToken = token;
            const tokenRefreshEnabled = process.env.ODH_TOKEN_REFRESH === 'true';

            const getCurrentToken = (() => {
              if (!tokenRefreshEnabled) {
                return () => cachedToken;
              }

              let lastTokenFetch = Date.now();
              const TOKEN_REFRESH_MIN_INTERVAL = 5000;
              return () => {
                const now = Date.now();
                if (now - lastTokenFetch > TOKEN_REFRESH_MIN_INTERVAL) {
                  try {
                    const newToken = execSync('oc whoami --show-token', {
                      stdio: ['pipe', 'pipe', 'ignore'],
                    })
                      .toString()
                      .trim();
                    if (newToken !== cachedToken) {
                      console.info('Token refreshed (oc user may have switched)');
                      cachedToken = newToken;
                    }
                  } catch (e) {
                    console.warn('Failed to refresh oc token, using cached token');
                  } finally {
                    lastTokenFetch = now;
                  }
                }
                return cachedToken;
              };
            })();

            const odhProject = process.env.OC_PROJECT || 'opendatahub';
            const app = process.env.ODH_APP || 'odh-dashboard';
            console.info('Using project:', odhProject);

            if (dashboardHost) {
              console.info('Using explicit ODH_DASHBOARD_HOST:', dashboardHost);
            }

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
              // try to get dashboard host from Route, but skip if its backend is a redirect service
              try {
                const routeJson = execSync(`oc get routes -n ${odhProject} ${app} -o json`, {
                  stdio: ['pipe', 'pipe', 'ignore'],
                }).toString();
                const route = JSON.parse(routeJson);
                if (route?.spec?.to?.name !== 'dashboard-redirect') {
                  dashboardHost = route?.spec?.host;
                }
              } catch (e) {
                // ignore
              }
            }

            if (!dashboardHost) {
              // default to legacy behavior if ODH_SUBDOMAIN is not set
              const subdomain = devLegacy ? `${app}-${odhProject}` : `rh-ai`;
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

            // Collect proxyService entries that have a localService AND whose
            // cluster service actually exists, so we don't create dead proxy
            // routes or remove gateway fallbacks for absent services.
            const availableLocalServices = moduleFederationConfig.flatMap((config) =>
              (config.proxyService || [])
                .filter((ps) => ps.localService)
                .filter((ps) => {
                  const namespace = ps.service.namespace || odhProject;
                  const svcName = ps.service.name;
                  try {
                    execFileSync('oc', ['get', 'svc', svcName, '-n', namespace], {
                      stdio: 'ignore',
                    });
                    return true;
                  } catch {
                    console.info(`Skipping port-forward: svc/${svcName} not found in ${namespace}`);
                    return false;
                  }
                }),
            );

            // Build per-service proxy entries only for verified services.
            // Port-forward tunnels raw TCP so we connect via HTTPS.
            const localProxyEntries = availableLocalServices.map((ps) => ({
              context: [ps.path],
              target: `https://${ps.localService.host || 'localhost'}:${ps.localService.port}`,
              secure: false,
              changeOrigin: true,
              pathRewrite: { [`^${ps.path}`]: ps.pathRewrite ?? '' },
              headers,
              onProxyReq: (proxyReq) => {
                const currentToken = getCurrentToken();
                proxyReq.setHeader('Authorization', `Bearer ${currentToken}`);
              },
            }));

            // Auto-spawn port-forwards for the verified services
            availableLocalServices.forEach((ps) => {
              const localPort = ps.localService.port;
              const remotePort = ps.service.port;
              const namespace = ps.service.namespace || odhProject;
              const svcName = ps.service.name;

              let current;
              let stopping = false;

              const startPortForward = () => {
                console.info(
                  `Port-forwarding svc/${svcName} ${localPort}:${remotePort} -n ${namespace}`,
                );
                current = spawn(
                  'oc',
                  ['port-forward', `svc/${svcName}`, `${localPort}:${remotePort}`, '-n', namespace],
                  { stdio: ['ignore', 'pipe', 'pipe'] },
                );
                current.stderr.on('data', (data) =>
                  console.warn(`[port-forward ${svcName}]`, data.toString().trim()),
                );
                current.on('error', (err) =>
                  console.warn(`Port-forward for ${svcName} failed: ${err.message}`),
                );
                current.on('exit', (code) => {
                  if (!stopping) {
                    console.info(
                      `Port-forward for ${svcName} dropped (code ${code}), restarting...`,
                    );
                    setTimeout(() => !stopping && startPortForward(), 1000);
                  }
                });
              };

              startPortForward();

              const cleanup = () => {
                stopping = true;
                try {
                  current?.kill();
                } catch {
                  // already exited
                }
              };
              process.on('exit', cleanup);
              process.on('SIGINT', cleanup);
              process.on('SIGTERM', cleanup);
            });

            // Remove locally-proxied paths from the gateway proxy
            const localProxyPaths = new Set(localProxyEntries.flatMap((e) => e.context));
            const gatewayMfProxies = mfProxies.filter((p) => !localProxyPaths.has(p));

            return [
              ...localProxyEntries,
              {
                context: ['/api', '/_mf', '/mlflow', ...gatewayMfProxies],
                target: `https://${dashboardHost}`,
                secure: false,
                changeOrigin: true,
                headers,
                onProxyReq: (proxyReq) => {
                  const currentToken = getCurrentToken();
                  proxyReq.setHeader('Authorization', `Bearer ${currentToken}`);
                  if (shouldFwdAccessToken) {
                    proxyReq.setHeader('x-forwarded-access-token', currentToken);
                  }
                },
              },
              {
                context: ['/wss/k8s'],
                target: `wss://${dashboardHost}`,
                secure: false,
                ws: true,
                changeOrigin: true,
                headers,
                onProxyReq: (proxyReq) => {
                  const currentToken = getCurrentToken();
                  proxyReq.setHeader('Authorization', `Bearer ${currentToken}`);
                  if (shouldFwdAccessToken) {
                    proxyReq.setHeader('x-forwarded-access-token', currentToken);
                  }
                },
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
