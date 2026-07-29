/* eslint-disable @typescript-eslint/restrict-template-expressions */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { merge } = require('webpack-merge');
const { rimrafSync } = require('rimraf');
const { TsCheckerRspackPlugin } = require('ts-checker-rspack-plugin');
const { ReactRefreshRspackPlugin } = require('@rspack/plugin-react-refresh');
const { setupWebpackDotenvFilesForEnv, setupDotenvFilesForEnv } = require('./dotenv');

setupDotenvFilesForEnv({ env: 'development' });
const webpackCommon = require('./webpack.common.js');
const { moduleFederationConfig } = require('./moduleFederation');

const RELATIVE_DIRNAME = process.env._ODH_RELATIVE_DIRNAME;
const IS_PROJECT_ROOT_DIR = process.env._ODH_IS_PROJECT_ROOT_DIR;
const DIST_DIR = process.env._ODH_DIST_DIR;
const HOST = process.env._ODH_HOST;
const PORT = process.env._ODH_PORT;
const BACKEND_PORT = process.env._BACKEND_PORT;

if (!DIST_DIR) {
  throw new Error(
    'Missing _ODH_DIST_DIR. Ensure setupDotenvFilesForEnv() ran before loading the dev config.',
  );
}

// Copied (or previously emitted) asset dirs under DIST_DIR. Cleared before compile
// so disk cannot serve stale files alongside in-memory devMiddleware output.
const DIST_ASSET_DIRS = ['images', 'locales', 'favicons', 'fonts'];

/**
 * Remove stale webpack/rspack outputs from DIST_DIR so they cannot be mixed with
 * in-memory HMR assets. Must not run at config import — only when compiling/serving.
 *
 * @param {string} distDir
 */
const cleanStaleDevArtifacts = (distDir) => {
  if (!fs.existsSync(distDir)) {
    return;
  }
  for (const name of fs.readdirSync(distDir)) {
    if (
      /\.(js|css)(\.map)?$/.test(name) ||
      name === 'index.html' ||
      name === 'mf-manifest.json' ||
      name === 'mf-stats.json' ||
      DIST_ASSET_DIRS.includes(name)
    ) {
      rimrafSync(path.join(distDir, name));
    }
  }
};

const mfProxies = moduleFederationConfig
  .map((config) => config.proxyService?.map((p) => p.path))
  .flat()
  .filter((p) => p);

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
    // Persist compile artifacts across `rspack dev` restarts. Default is
    // memory-only, which forces a full cold rebuild every process start.
    cache: {
      type: 'persistent',
      // CLI env / dotenv values are not auto-tracked. Digest vars that are
      // inlined (dotenv-webpack / DefinePlugin / EnvironmentPlugin) or that
      // change the compile graph so CLI overrides bust the cache too.
      version: JSON.stringify({
        // frontend/src/utilities/const.ts (+ HtmlWebpackPlugin branding)
        APP_ENV: process.env.APP_ENV,
        WS_HOSTNAME: process.env.WS_HOSTNAME,
        POLL_INTERVAL: process.env.POLL_INTERVAL,
        FAST_POLL_INTERVAL: process.env.FAST_POLL_INTERVAL,
        SERVER_TIMEOUT: process.env.SERVER_TIMEOUT,
        DOC_LINK: process.env.DOC_LINK,
        COMMUNITY_LINK: process.env.COMMUNITY_LINK,
        SUPPORT_LINK: process.env.SUPPORT_LINK,
        ODH_LOGO: process.env.ODH_LOGO,
        ODH_LOGO_DARK: process.env.ODH_LOGO_DARK,
        ODH_PRODUCT_NAME: process.env.ODH_PRODUCT_NAME,
        ODH_FAVICON: process.env.ODH_FAVICON,
        DASHBOARD_CONFIG: process.env.DASHBOARD_CONFIG,
        EXT_CLUSTER: process.env.EXT_CLUSTER,
        INTERNAL_DASHBOARD_VERSION: process.env.INTERNAL_DASHBOARD_VERSION,
        CONSOLE_LINK_DOMAIN: process.env.CONSOLE_LINK_DOMAIN,
        // EnvironmentPlugin default / override (webpack.common.js)
        MF_REMOTES: process.env.MF_REMOTES,
        // Dotenv seeds that change entry/includes/output/publicPath (webpack.common.js)
        ODH_SRC_DIR: process.env.ODH_SRC_DIR,
        ODH_COMMON_DIR: process.env.ODH_COMMON_DIR,
        ODH_DIST_DIR: process.env.ODH_DIST_DIR,
        ODH_PUBLIC_PATH: process.env.ODH_PUBLIC_PATH,
        ODH_IMAGES_DIRNAME: process.env.ODH_IMAGES_DIRNAME,
        // Compile-graph toggles (loaders, MF, plugin discovery)
        COVERAGE: process.env.COVERAGE,
        MF_DEV: process.env.MF_DEV,
        PLUGIN_PACKAGES: process.env.PLUGIN_PACKAGES,
        MODULE_FEDERATION_CONFIG: process.env.MODULE_FEDERATION_CONFIG,
        MF_UPDATE_TYPES: process.env.MF_UPDATE_TYPES,
      }),
      storage: {
        type: 'filesystem',
        directory: path.join(__dirname, '../node_modules/.cache/rspack'),
      },
    },
    optimization: {
      // Module Federation embeds its runtime in the entry; a separate runtime
      // chunk races with shared consume factories (undefined.call) especially
      // when the page loads before the first compile finishes.
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

          const odhProject = process.env.OC_PROJECT || 'opendatahub';
          const app = process.env.ODH_APP || 'odh-dashboard';
          console.info('Using project:', odhProject);

          if (dashboardHost) {
            console.info('Using explicit ODH_DASHBOARD_HOST:', dashboardHost);
          }

          try {
            const httpRouteJson = execSync(`oc get httproutes -n ${odhProject} ${app} -o json`, {
              stdio: ['pipe', 'pipe', 'ignore'],
            }).toString();
            const httpRoute = JSON.parse(httpRouteJson);

            const parentRef = httpRoute?.status?.parents?.[0]?.parentRef;
            const gatewayName = parentRef?.name;
            const gatewayNamespace = parentRef?.namespace || odhProject;

            if (gatewayName && gatewayNamespace) {
              const gatewayJson = execSync(
                `oc get gateway -n ${gatewayNamespace} ${gatewayName} -o json`,
                { stdio: ['pipe', 'pipe', 'ignore'] },
              ).toString();
              const gateway = JSON.parse(gatewayJson);

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
        writeToDisk: false,
      },
      client: {
        overlay: false,
      },
      // Only brand images copied by CopyRspackPlugin (e.g. Header `/images/...`).
      // Fonts and imported assets are served from memory via devMiddleware.
      static: [{ directory: path.join(DIST_DIR, 'images'), publicPath: '/images' }],
      setupMiddlewares: (middlewares, devServer) => {
        if (!devServer) {
          return middlewares;
        }

        // onListening fires when the port opens — before the first compile.
        // Log availability only after a successful compilation so early page
        // loads don't hit half-written MF/runtime chunks.
        let announced = false;
        devServer.compiler.hooks.done.tap('OdhDevServerReady', (stats) => {
          if (announced || stats.hasErrors()) {
            return;
          }
          announced = true;
          const port = devServer.server?.address?.()?.port ?? PORT;
          console.log(
            `\x1b[32m✓ ODH Dashboard available at: \x1b[4mhttp://localhost:${port}\x1b[0m`,
          );
        });

        return middlewares;
      },
    },
    plugins: [
      {
        // Clean once when the compiler actually runs — not when this file is required.
        apply(compiler) {
          let cleaned = false;
          const cleanOnce = () => {
            if (cleaned) {
              return;
            }
            cleaned = true;
            cleanStaleDevArtifacts(DIST_DIR);
          };
          compiler.hooks.beforeRun.tap('OdhCleanStaleDevArtifacts', cleanOnce);
          compiler.hooks.watchRun.tap('OdhCleanStaleDevArtifacts', cleanOnce);
        },
      },
      new TsCheckerRspackPlugin({ async: true }),
      new ReactRefreshRspackPlugin({ overlay: false }),
    ],
  },
);
