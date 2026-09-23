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
  const hostPublicCypressDir = findPublicCypressDir('frontend', root);
  if (!hostPublicCypressDir) {
    throw new Error('Missing public-cypress for odh-dashboard-frontend (frontend)');
  }

  /** @type {MockFederationServer[]} */
  const servers = [
    {
      packageName: 'odh-dashboard-frontend',
      moduleName: 'host',
      port: HOST_PORT,
      publicCypressDir: hostPublicCypressDir,
      waitPath: '/index.html',
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
 * @param {MockFederationServer} server
 * @returns {string} path relative to public-cypress root
 */
const getWaitTargetRelativePath = (server) => {
  const waitPath = server.waitPath.startsWith('/') ? server.waitPath.slice(1) : server.waitPath;
  return waitPath || 'index.html';
};

/**
 * @param {MockFederationServer} server
 * @returns {string} absolute path to the file that must exist before serving
 */
const getWaitTargetFilePath = (server) =>
  path.join(server.publicCypressDir, getWaitTargetRelativePath(server));

/**
 * Fail fast when restored CI artifacts are incomplete. wait-on http-get would hang forever on 404.
 * @param {MockFederationServer[]} servers
 * @param {string} root absolute repo root
 */
const assertWaitTargetsReady = (servers, root) => {
  /** @type {string[]} */
  const missing = [];

  for (const server of servers) {
    const targetPath = getWaitTargetFilePath(server);
    if (!fs.existsSync(targetPath)) {
      missing.push(
        `${server.packageName} (expected ${path.relative(root, targetPath)} for :${server.port})`,
      );
    }
  }

  if (missing.length === 0) {
    return;
  }

  for (const entry of missing) {
    console.error(`Missing Cypress mock wait target for ${entry}`);
  }
  throw new Error('Cypress mock federation wait targets are missing');
};

/**
 * Wait for static serve listeners. Use TCP (not http-get) so a running server that returns 404
 * cannot block CI until the job timeout.
 * @param {MockFederationServer[]} servers
 * @returns {string[]}
 */
const getWaitUrls = (servers) => servers.map((server) => `tcp:127.0.0.1:${server.port}`);

module.exports = {
  HOST_PORT,
  assertWaitTargetsReady,
  convertModuleFederationConfig,
  findPublicCypressDir,
  getWaitTargetFilePath,
  getWaitTargetRelativePath,
  getWaitUrls,
  listMockFederationServers,
  normalizeModuleFederationConfig,
};
