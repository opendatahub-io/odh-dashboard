/**
 * Discover and serve Cypress mock module-federation remotes from prebuilt public-cypress dirs.
 *
 * Cypress mock tests proxy /_mf/{name}/* to http://localhost:{port}/* (see packages/cypress/cypress/support/e2e.ts).
 * The same workspace capabilities and federation metadata select build, dev, and static servers.
 * CI pre-builds each federated package's public-cypress artifact; static servers do not use
 * turbo cypress:server:wait (which blocks on BFF /healthcheck endpoints).
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
 * @property {string} workspacePath repo-relative workspace directory
 * @property {string} waitPath URL path segment to wait on
 */

/**
 * Select only dashboard mock federation participants, never standalone nested frontends.
 * This phase must work before any builds exist (for Turbo build/dev selection).
 * @param {string} root absolute repo root
 * @returns {MockFederationServer[]}
 */
const listMockFederationTargets = (root) => {
  const packages = listWorkspacePackagesFromManifest(root);
  const host = packages.find((pkg) => pkg.path === 'frontend');
  if (host?.name !== 'odh-dashboard-frontend') {
    throw new Error('Missing dashboard host workspace (frontend)');
  }
  for (const script of ['cypress:mock:build', 'cypress:mock:build:coverage', 'cypress:mock:dev']) {
    if (!host.scripts?.[script]) {
      throw new Error(`Dashboard host is missing ${script}`);
    }
  }

  /** @type {MockFederationServer[]} */
  const targets = [
    {
      packageName: host.name,
      workspacePath: host.path,
      moduleName: 'host',
      port: HOST_PORT,
      waitPath: '/index.html',
    },
  ];
  const ports = new Map([[HOST_PORT, host.name]]);
  const names = new Map([['host', host.name]]);

  for (const pkg of packages) {
    if (pkg.path === 'frontend' || !pkg.scripts?.['cypress:mock:build']) {
      continue;
    }
    if (!pkg['module-federation']) {
      throw new Error(`${pkg.name} has cypress:mock:build but no module-federation config`);
    }
    for (const script of ['cypress:mock:build:coverage', 'cypress:mock:dev']) {
      if (!pkg.scripts[script]) {
        throw new Error(`${pkg.name} is missing ${script}`);
      }
    }

    const mf = normalizeModuleFederationConfig(pkg['module-federation']);
    const port = mf.backend?.localService?.port;
    const remoteEntry = mf.backend?.remoteEntry;
    if (!mf.name || !Number.isInteger(port) || port < 1 || port > 65535 || !remoteEntry) {
      throw new Error(`${pkg.name} needs a federation name, local port, and remoteEntry`);
    }
    if (ports.has(port)) {
      throw new Error(`Cypress mock port ${port} is shared by ${ports.get(port)} and ${pkg.name}`);
    }
    if (names.has(mf.name)) {
      throw new Error(
        `Cypress mock remote ${mf.name} is shared by ${names.get(mf.name)} and ${pkg.name}`,
      );
    }
    ports.set(port, pkg.name);
    names.set(mf.name, pkg.name);
    targets.push({
      packageName: pkg.name,
      workspacePath: pkg.path,
      moduleName: mf.name,
      port,
      waitPath: remoteEntry,
    });
  }

  return targets;
};

/**
 * Resolve built assets only when serving or waiting; build/dev must not require them.
 * @param {string} root absolute repo root
 * @returns {(MockFederationServer & {publicCypressDir: string})[]}
 */
const listMockFederationServers = (root) => {
  const targets = listMockFederationTargets(root);
  const missingBuilds = [];
  const servers = [];
  for (const target of targets) {
    const publicCypressDir = findPublicCypressDir(target.workspacePath, root);
    if (!publicCypressDir) {
      missingBuilds.push(`${target.packageName} (${target.workspacePath})`);
    } else {
      servers.push({ ...target, publicCypressDir });
    }
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
  listMockFederationTargets,
  normalizeModuleFederationConfig,
};
