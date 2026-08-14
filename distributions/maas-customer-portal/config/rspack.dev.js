const path = require('path');
const { execSync } = require('child_process');
const { merge } = require('rspack-merge');
const { TsCheckerRspackPlugin } = require('ts-checker-rspack-plugin');
const rspackCommon = require('./rspack.common.js');

const RELATIVE_DIRNAME = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(RELATIVE_DIRNAME, 'public');
const PORT = process.env.SHELL_PORT || 4020;

// Derived from frontend/config/webpack.dev.js — token acquisition, route
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
// Used when OC_PROJECT is set to proxy BFF calls through the cluster's dashboard route.
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
    return new URL(consoleUrl).host.replace(/^[^.]+\./, 'rh-ai.');
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

  // Cluster mode: discover dashboard route, proxy through its backend
  const odhProject = process.env.OC_PROJECT;
  if (odhProject) {
    const app = process.env.ODH_APP || 'odh-dashboard';
    console.info('Using project:', odhProject);
    const dashboardHost = process.env.ODH_DASHBOARD_HOST || discoverDashboardHost(odhProject, app);

    if (dashboardHost) {
      console.info('Dashboard host:', dashboardHost);
      return [
        {
          context: ['/maas/api', '/gen-ai/api'],
          target: `https://${dashboardHost}`,
          secure: false,
          changeOrigin: true,
          on,
        },
      ];
    }
    console.warn('Could not discover dashboard route. Falling back to local targets.');
  }

  // Local mode: proxy to explicit BFF targets (port-forward or local BFF)
  const MAAS_BFF_TARGET = process.env.MAAS_BFF_TARGET || 'http://localhost:4000';
  const GENAI_BFF_TARGET = process.env.GENAI_BFF_TARGET || 'http://localhost:8080';
  console.info('Proxy targets:', { maas: MAAS_BFF_TARGET, genAi: GENAI_BFF_TARGET });

  return [
    {
      context: ['/maas/api'],
      target: MAAS_BFF_TARGET,
      pathRewrite: { '^/maas/api': '/api' },
      secure: false,
      changeOrigin: true,
      on,
    },
    {
      context: ['/gen-ai/api'],
      target: GENAI_BFF_TARGET,
      pathRewrite: { '^/gen-ai/api': '/api' },
      secure: false,
      changeOrigin: true,
      on,
    },
  ];
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
    historyApiFallback: true,
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
        const url = `http://localhost:${addr.port}`;
        console.log(`${green}✓ MaaS Consumer Portal available at: ${underline}${url}${reset}`);
      } else {
        console.warn('MaaS Portal dev server started but could not determine address');
      }
    },
  },
  plugins: [new TsCheckerRspackPlugin()],
});
