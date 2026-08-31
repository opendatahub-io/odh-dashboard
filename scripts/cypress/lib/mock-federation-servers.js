/**
 * Discover and serve Cypress mock module-federation remotes from prebuilt public-cypress dirs.
 *
 * Cypress mock tests proxy /_mf/{name}/* to http://localhost:{port}/* (see packages/cypress/cypress/support/e2e.ts).
 * CI pre-builds each federated package's public-cypress artifact; this module starts static `serve` processes
 * on the ports declared in each package's module-federation metadata without using turbo cypress:server:wait
 * (which blocks on BFF /healthcheck endpoints that static serve does not expose).
 */
const fs = require('fs');
const path = require('path');

const { listWorkspacePackagesFromManifest } = require('../../query-workspace-packages');

const HOST_PORT = 9001;

const isOldModuleFederationConfig = (config) => 'remoteEntry' in config;

const convertModuleFederationConfig = (oldConfig) => {
  const { name, remoteEntry, authorize, local, service, proxy, tls } = oldConfig;

  const normalizedService = {
    name: service.name,
    namespace: service.namespace ?? '',
    port: service.port,
  };

  return {
    name,
    backend: {
      remoteEntry,
      service: normalizedService,
      ...(authorize !== undefined && { authorize }),
      ...(tls !== undefined && { tls }),
      ...(local && {
        localService: {
          host: local.host,
          port: local.port,
        },
      }),
    },
    proxyService: (proxy ?? []).map((p) => ({
      path: p.path,
      ...(p.pathRewrite && { pathRewrite: p.pathRewrite }),
      service: normalizedService,
      ...(authorize !== undefined && { authorize }),
      ...(local && {
        localService: {
          host: local.host,
          port: local.port,
        },
      }),
    })),
  };
};

const normalizeModuleFederationConfig = (config) =>
  isOldModuleFederationConfig(config) ? convertModuleFederationConfig(config) : config;

/**
 * Find the first public-cypress directory under a workspace path without walking node_modules/.pnpm.
 * @param {string} workspacePath repo-relative workspace path
 * @param {string} root absolute repo root
 * @returns {string | null} absolute path to public-cypress
 */
const findPublicCypressDir = (workspacePath, root) => {
  const workspaceAbs = path.resolve(root, workspacePath === '.' ? '' : workspacePath);
  if (!fs.existsSync(workspaceAbs)) {
    return null;
  }

  const queue = [workspaceAbs];
  while (queue.length > 0) {
    const dir = queue.shift();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.pnpm') {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name === 'public-cypress') {
        return fullPath;
      }
      if (entry.isDirectory()) {
        queue.push(fullPath);
      }
    }
  }

  return null;
};

/**
 * @typedef {Object} MockFederationServer
 * @property {string} packageName npm package name
 * @property {string} moduleName module-federation remote name
 * @property {number} port localhost port for static serve
 * @property {string} publicCypressDir absolute path to serve root
 * @property {string} waitPath URL path segment to wait on (remoteEntry or /)
 */

/**
 * @param {string} root absolute repo root
 * @returns {MockFederationServer[]}
 */
const listMockFederationServers = (root) => {
  const packages = listWorkspacePackagesFromManifest(root);
  /** @type {MockFederationServer[]} */
  const servers = [
    {
      packageName: 'odh-dashboard-frontend',
      moduleName: 'host',
      port: HOST_PORT,
      publicCypressDir: path.join(root, 'frontend', 'public-cypress'),
      waitPath: '/',
    },
  ];

  const seenPorts = new Set([HOST_PORT]);
  /** @type {string[]} */
  const missingBuilds = [];

  for (const pkg of packages) {
    const mfRaw = pkg['module-federation'];
    if (!mfRaw || !pkg.scripts?.['cypress:server:build:coverage']) {
      continue;
    }

    const mf = normalizeModuleFederationConfig(mfRaw);
    const port = mf.backend?.localService?.port;
    const remoteEntry = mf.backend?.remoteEntry;

    if (port == null || seenPorts.has(port)) {
      continue;
    }

    const publicCypressDir = findPublicCypressDir(pkg.path, root);
    if (!publicCypressDir) {
      missingBuilds.push(`${pkg.name} (${pkg.path})`);
      continue;
    }

    seenPorts.add(port);
    servers.push({
      packageName: pkg.name,
      moduleName: mf.name,
      port,
      publicCypressDir,
      waitPath: remoteEntry || '/',
    });
  }

  if (missingBuilds.length > 0) {
    throw new Error(
      `Missing public-cypress for Cypress federation packages: ${missingBuilds.join(', ')}`,
    );
  }

  return servers;
};

/**
 * @param {MockFederationServer[]} servers
 * @returns {string[]}
 */
const getWaitUrls = (servers) =>
  servers.map((server) => {
    const waitPath = server.waitPath.startsWith('/') ? server.waitPath : `/${server.waitPath}`;
    return `http-get://localhost:${server.port}${waitPath}`;
  });

module.exports = {
  HOST_PORT,
  convertModuleFederationConfig,
  findPublicCypressDir,
  getWaitUrls,
  listMockFederationServers,
  normalizeModuleFederationConfig,
};
