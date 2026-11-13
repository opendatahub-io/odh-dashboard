/* eslint-disable @typescript-eslint/restrict-template-expressions */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { merge } = require('rspack-merge');
const { rimrafSync } = require('rimraf');
const { TsCheckerRspackPlugin } = require('ts-checker-rspack-plugin');
const { ReactRefreshRspackPlugin } = require('@rspack/plugin-react-refresh');
const { setupWebpackDotenvFilesForEnv, setupDotenvFilesForEnv } = require('./dotenv');

setupDotenvFilesForEnv({ env: 'development' });
const rspackCommon = require('./rspack.common.js');
const { moduleFederationConfig } = require('./moduleFederation');
const { createDevCspMiddleware } = require('./cspPolicy');

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
 * Remove stale rspack outputs from DIST_DIR so they cannot be mixed with
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

const OC_SILENT = { stdio: ['pipe', 'pipe', 'ignore'] };

/** Runs an `oc` command and returns its trimmed stdout. */
const runOc = (command) => execSync(command, OC_SILENT).toString().trim();

/**
 * Dev-server proxy targets: the cluster's dashboard when `EXT_CLUSTER` is set, the local
 * backend otherwise. In cluster mode the host is taken from an explicit override, then an
 * HTTPRoute/Gateway, then a Route, and finally derived from the console URL.
 */
const buildProxyConfig = () => {
  if (!process.env.EXT_CLUSTER) {
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
  }

  const devLegacy = process.env.DEV_LEGACY === 'true';
  let dashboardHost = process.env.ODH_DASHBOARD_HOST;
  let token;

  try {
    token = runOc('oc whoami --show-token');
    console.info('Logged in as user:', runOc('oc whoami'));
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
    const httpRoute = JSON.parse(runOc(`oc get httproutes -n ${odhProject} ${app} -o json`));
    const parentRef = httpRoute?.status?.parents?.[0]?.parentRef;
    const gatewayName = parentRef?.name;
    const gatewayNamespace = parentRef?.namespace || odhProject;

    if (gatewayName && gatewayNamespace) {
      const gateway = JSON.parse(
        runOc(`oc get gateway -n ${gatewayNamespace} ${gatewayName} -o json`),
      );
      const httpsListener = (gateway?.spec?.listeners || []).find(
        (listener) => listener.name === 'https',
      );
      if (httpsListener?.hostname) {
        dashboardHost = httpsListener.hostname;
      }
    }
  } catch (e) {
    // ignore
  }

  if (!dashboardHost) {
    try {
      const route = JSON.parse(runOc(`oc get routes -n ${odhProject} ${app} -o json`));
      if (route?.spec?.to?.name !== 'dashboard-redirect') {
        dashboardHost = route?.spec?.host;
      }
    } catch (e) {
      // ignore
    }
  }

  if (!dashboardHost) {
    const subdomain = devLegacy ? `${app}-${odhProject}` : 'rh-ai';
    console.info(
      `Failed to GET dashboard hostname, constructing hostname using subdomain '${subdomain}'.`,
    );
    if (!devLegacy) {
      console.info('Use DEV_LEGACY=true to override with legacy behavior. eg. DEV_LEGACY=true');
    }
    dashboardHost = new URL(runOc('oc whoami --show-console')).host.replace(
      /^[^.]+\./,
      `${subdomain}.`,
    );
  }

  console.info('Dashboard host:', dashboardHost);

  let shouldFwdAccessToken = false;
  try {
    const deployment = JSON.parse(runOc(`oc get deployment -n ${odhProject} ${app} -o json`));
    const containers = deployment?.spec?.template?.spec?.containers || [];
    shouldFwdAccessToken = containers.some(
      (container) => container.name === 'oauth-proxy' || container.image?.includes('oauth-proxy'),
    );
  } catch (e) {
    shouldFwdAccessToken = devLegacy;
    // ignore
  }

  const headers = { Authorization: `Bearer ${token}` };
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
};

const proxyConfig = buildProxyConfig();
// Contexts the dev server forwards to another server, whose documents keep their own
// policy instead of the dashboard's.
const proxyContexts = proxyConfig.flatMap((entry) => entry.context ?? []);

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
  rspackCommon('development'),
  {
    mode: 'development',
    devtool: 'eval-source-map',
    lazyCompilation: false,
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
      proxy: proxyConfig,
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

        // Shared policy + declared dev delta, Report-Only, documents only. Proxied
        // documents are excluded: they belong to the server being proxied.
        middlewares.unshift(createDevCspMiddleware(PORT, proxyContexts));

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
