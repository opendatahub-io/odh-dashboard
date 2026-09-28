const path = require('path');
const fs = require('fs');
const https = require('https');
const { execSync } = require('child_process');
const { merge } = require('rspack-merge');
const { TsCheckerRspackPlugin } = require('ts-checker-rspack-plugin');
const rspackCommon = require('./rspack.common.js');

const RELATIVE_DIRNAME = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(RELATIVE_DIRNAME, 'public');
const PORT = process.env.SHELL_PORT || 4020;
const BASE_PATH = '/maas-consumer-portal';
const portalApiPaths = {
  maas: `${BASE_PATH}/maas/api`,
  genAi: `${BASE_PATH}/gen-ai/api`,
  perses: `${BASE_PATH}/perses/api`,
  k8s: `${BASE_PATH}/api/k8s`,
  operatorSubscriptionStatus: `${BASE_PATH}/api/operator-subscription-status`,
};
const portalApiContexts = Object.values(portalApiPaths);

const clusterCAFile = process.env.ODH_DASHBOARD_CA_FILE;
const clusterProxyAgent = clusterCAFile
  ? new https.Agent({ ca: fs.readFileSync(clusterCAFile) })
  : undefined;

// Derived from frontend/config/rspack.dev.js — token acquisition, route
// discovery, and proxy setup are duplicated across 7+ bundler configs in the
// repo. Extract into a shared dev-proxy utility in packages/app-config.

const getOcToken = () => {
  try {
    const token = execSync('oc whoami --show-token', { stdio: ['pipe', 'pipe', 'ignore'] })
      .toString()
      .trim();
    const username = execSync('oc whoami', { stdio: ['pipe', 'pipe', 'ignore'] })
      .toString()
      .trim();
    console.info('Logged in as user:', username);
    return token;
  } catch (e) {
    return '';
  }
};

// 3-tier dashboard host discovery: HTTPRoute/Gateway → OCP Route → console URL.
// Used when EXT_CLUSTER or OC_PROJECT is set to proxy BFF calls through the cluster's dashboard route.
const discoverDashboardHost = (odhProject, app) => {
  // 1. Try HTTPRoute → Gateway → hostname (new pattern)
  try {
    const httpRouteJson = execSync(`oc get httproutes -n ${odhProject} ${app} -o json`, {
      stdio: ['pipe', 'pipe', 'ignore'],
    }).toString();
    const httpRoute = JSON.parse(httpRouteJson);
    const parentRef = httpRoute?.status?.parents?.[0]?.parentRef;
    const gatewayName = parentRef?.name;
    const gatewayNamespace = parentRef?.namespace || odhProject;
    if (gatewayName && gatewayNamespace) {
      const gatewayJson = execSync(`oc get gateway -n ${gatewayNamespace} ${gatewayName} -o json`, {
        stdio: ['pipe', 'pipe', 'ignore'],
      }).toString();
      const gateway = JSON.parse(gatewayJson);
      const httpsListener = (gateway?.spec?.listeners || []).find((l) => l.name === 'https');
      if (httpsListener?.hostname) {
        return httpsListener.hostname;
      }
    }
  } catch (e) {
    // fall through
  }

  // 2. Try OpenShift Route
  try {
    const routeJson = execSync(`oc get routes -n ${odhProject} ${app} -o json`, {
      stdio: ['pipe', 'pipe', 'ignore'],
    }).toString();
    const route = JSON.parse(routeJson);
    if (route?.spec?.host && route?.spec?.to?.name !== 'dashboard-redirect') {
      return route.spec.host;
    }
  } catch (e) {
    // fall through
  }

  // 3. Construct from console URL
  try {
    const consoleUrl = execSync('oc whoami --show-console', {
      stdio: ['pipe', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    const subdomain = process.env.DEV_LEGACY === 'true' ? `${app}-${odhProject}` : 'rh-ai';
    return new URL(consoleUrl).host.replace(/^[^.]+\./, `${subdomain}.`);
  } catch (e) {
    // fall through
  }

  return '';
};

// Dual-mode proxy: cluster mode (OC_PROJECT set → discover dashboard route)
// or local mode (explicit MAAS_BFF_TARGET / GENAI_BFF_TARGET for port-forward
// or mock BFFs). Injects auth headers on every proxied request.
const buildProxyConfig = () => {
  const token = process.env.AUTH_TOKEN || getOcToken();
  if (!token) {
    console.error('No auth token available. Run `oc login` first.');
  }

  const mockUser = process.env.MOCK_USER;
  // @rspack/dev-server uses http-proxy-middleware v3: hooks live under `on`,
  // not the webpack-dev-server v4 `onProxyReq` name (which is silently ignored).
  const on = {
    proxyReq: (proxyReq, req) => {
      if (mockUser) {
        proxyReq.setHeader('kubeflow-userid', mockUser);
        if (token) {
          proxyReq.setHeader('Authorization', `Bearer ${token}`);
          proxyReq.setHeader('x-forwarded-access-token', token);
        } else {
          proxyReq.setHeader('x-forwarded-access-token', 'mock-token');
        }
        return;
      }
      const incomingAuth = req.headers.authorization;
      if (incomingAuth) {
        proxyReq.setHeader('Authorization', incomingAuth);
        proxyReq.setHeader('x-forwarded-access-token', incomingAuth.replace(/^Bearer\s+/i, ''));
      } else if (token) {
        proxyReq.setHeader('Authorization', `Bearer ${token}`);
        proxyReq.setHeader('x-forwarded-access-token', token);
      }
    },
  };

  // Match frontend start:dev:ext: discover the dashboard route and proxy through
  // its backend. OC_PROJECT is required for non-default namespaces.
  const odhProject = process.env.OC_PROJECT || (process.env.EXT_CLUSTER ? 'opendatahub' : '');
  if (odhProject) {
    const app = process.env.ODH_APP || 'odh-dashboard';
    if (!token) {
      throw new Error(
        'Login with `oc login` prior to starting dev server in external-cluster mode.',
      );
    }
    console.info('Using project:', odhProject);
    const dashboardHost = process.env.ODH_DASHBOARD_HOST || discoverDashboardHost(odhProject, app);

    if (dashboardHost) {
      console.info('Dashboard host:', dashboardHost);
      if (!clusterCAFile) {
        console.info(
          'Using the same TLS behavior as frontend start:dev:ext. Set ODH_DASHBOARD_CA_FILE to verify an internally signed dashboard certificate.',
        );
      }
      let shouldForwardAccessToken = false;
      try {
        const deploymentJson = execSync(`oc get deployment -n ${odhProject} ${app} -o json`, {
          stdio: ['pipe', 'pipe', 'ignore'],
        }).toString();
        const deployment = JSON.parse(deploymentJson);
        const containers = deployment?.spec?.template?.spec?.containers || [];
        shouldForwardAccessToken = containers.some(
          (container) =>
            container.name === 'oauth-proxy' || container.image?.includes('oauth-proxy'),
        );
      } catch (e) {
        shouldForwardAccessToken = process.env.DEV_LEGACY === 'true';
      }

      const headers = { Authorization: `Bearer ${token}` };
      if (shouldForwardAccessToken) {
        console.info('Supplying x-forwarded-access-token header');
        headers['x-forwarded-access-token'] = token;
      }

      return [
        {
          context: portalApiContexts,
          target: `https://${dashboardHost}`,
          pathRewrite: { [`^${BASE_PATH}`]: '' },
          secure: Boolean(clusterCAFile),
          ...(clusterProxyAgent ? { agent: clusterProxyAgent } : {}),
          changeOrigin: true,
          headers,
        },
      ];
    }
    throw new Error(
      'Could not discover the Dashboard host. Set ODH_DASHBOARD_HOST to its hostname and try again.',
    );
  }

  // Local mode: proxy to explicit BFF targets (port-forward or local BFF)
  const MAAS_BFF_TARGET = process.env.MAAS_BFF_TARGET || 'http://localhost:4000';
  const GENAI_BFF_TARGET = process.env.GENAI_BFF_TARGET || 'http://localhost:8080';
  const PERSES_TARGET = process.env.PERSES_TARGET || 'http://localhost:9005';
  const CORE_BFF_TARGET = process.env.CORE_BFF_TARGET || 'http://localhost:4000';
  console.info('Proxy targets:', {
    maas: MAAS_BFF_TARGET,
    genAi: GENAI_BFF_TARGET,
    perses: PERSES_TARGET,
    coreBff: CORE_BFF_TARGET,
  });

  return [
    { path: portalApiPaths.maas, target: MAAS_BFF_TARGET, pathRewrite: '/api' },
    { path: portalApiPaths.genAi, target: GENAI_BFF_TARGET, pathRewrite: '/api' },
    { path: portalApiPaths.perses, target: PERSES_TARGET, pathRewrite: '' },
    { path: portalApiPaths.k8s, target: CORE_BFF_TARGET, pathRewrite: '/api/k8s' },
    {
      path: portalApiPaths.operatorSubscriptionStatus,
      target: CORE_BFF_TARGET,
      pathRewrite: '/api/operator-subscription-status',
    },
  ].map(({ path: proxyPath, target, pathRewrite }) => ({
    context: [proxyPath],
    target,
    pathRewrite: { [`^${proxyPath}`]: pathRewrite },
    secure: false,
    changeOrigin: true,
    on,
  }));
};

module.exports = merge(rspackCommon(), {
  mode: 'development',
  devtool: 'eval-source-map',
  optimization: {
    removeEmptyChunks: true,
  },
  devServer: {
    host: 'localhost',
    port: PORT,
    compress: true,
    historyApiFallback: { index: `${BASE_PATH}/` },
    hot: true,
    proxy: buildProxyConfig(),
    client: {
      overlay: { errors: true, warnings: false },
    },
    static: {
      directory: DIST_DIR,
    },
    onListening: (devServer) => {
      const addr = devServer?.server?.address();
      if (addr) {
        const green = '\x1b[32m';
        const underline = '\x1b[4m';
        const reset = '\x1b[0m';
        const url = `http://localhost:${addr.port}${BASE_PATH}/`;
        console.log(`${green}✓ MaaS Consumer Portal available at: ${underline}${url}${reset}`);
      } else {
        console.warn('MaaS Portal dev server started but could not determine address');
      }
    },
  },
  plugins: [new TsCheckerRspackPlugin()],
});
