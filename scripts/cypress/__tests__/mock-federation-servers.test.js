const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  assertWaitTargetsReady,
  findPublicCypressDir,
  getWaitTargetFilePath,
  getWaitUrls,
  listMockFederationServers,
  listMockFederationTargets,
  normalizeModuleFederationConfig,
} = require('../lib/mock-federation-servers');

const writePackage = (root, location, pkg) => {
  const dir = path.join(root, location);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg));
  return dir;
};

const createWorkspace = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'odh-cy-'));
  fs.writeFileSync(
    path.join(root, 'pnpm-workspace.yaml'),
    ['packages:', '  - packages/*', '  - packages/*/frontend', '  - frontend'].join('\n'),
  );
  writePackage(root, '.', { name: 'odh-dashboard' });
  writePackage(root, 'frontend', {
    name: 'odh-dashboard-frontend',
    scripts: {
      'cypress:mock:build': 'true',
      'cypress:mock:build:coverage': 'true',
      'cypress:mock:dev': 'true',
    },
  });
  const demo = writePackage(root, 'packages/demo', {
    name: '@odh-dashboard/demo',
    scripts: {
      'cypress:mock:build': 'true',
      'cypress:mock:build:coverage': 'true',
      'cypress:mock:dev': 'true',
    },
    'module-federation': {
      name: 'demo',
      remoteEntry: '/remoteEntry.js',
      local: { host: 'localhost', port: 9199 },
      service: { name: 'odh-dashboard', port: 8043 },
    },
  });
  writePackage(root, 'packages/demo/frontend', {
    name: 'demo-ui',
    scripts: { 'cypress:server': 'serve -p 9001', 'cypress:server:dev': 'rspack dev' },
  });
  return { root, demo };
};

const withWorkspace = (test) => {
  const workspace = createWorkspace();
  try {
    test(workspace);
  } finally {
    fs.rmSync(workspace.root, { recursive: true, force: true });
  }
};

const writeBuilds = ({ root, demo }, remoteEntry = true) => {
  const hostBuild = path.join(root, 'frontend', 'public-cypress');
  const remoteBuild = path.join(demo, 'frontend', 'public-cypress');
  fs.mkdirSync(hostBuild, { recursive: true });
  fs.mkdirSync(remoteBuild, { recursive: true });
  fs.writeFileSync(path.join(hostBuild, 'index.html'), '<html></html>');
  if (remoteEntry) {
    fs.writeFileSync(path.join(remoteBuild, 'remoteEntry.js'), '/* remote */');
  }
};

describe('normalizeModuleFederationConfig', () => {
  it('converts legacy module-federation metadata to backend.localService', () => {
    const normalized = normalizeModuleFederationConfig({
      name: 'maas',
      remoteEntry: '/remoteEntry.js',
      local: { host: 'localhost', port: 9104 },
      service: { name: 'odh-dashboard', port: 8043 },
    });
    assert.equal(normalized.backend.localService.port, 9104);
    assert.equal(normalized.backend.remoteEntry, '/remoteEntry.js');
  });
});

describe('listMockFederationTargets', () => {
  it('selects host and opted-in remotes, not nested standalone Cypress servers', () => {
    withWorkspace(({ root }) => {
      const targets = listMockFederationTargets(root);
      assert.deepEqual(
        targets.map((target) => target.packageName),
        ['odh-dashboard-frontend', '@odh-dashboard/demo'],
      );
      assert.equal(targets[1].port, 9199);
    });
  });

  it('does not require builds or opt in unrelated module-federation packages', () => {
    withWorkspace(({ root }) => {
      writePackage(root, 'packages/other', {
        name: '@odh-dashboard/other',
        'module-federation': { name: 'other', local: { port: 9300 } },
        scripts: { 'cypress:server': 'serve -p 9300' },
      });
      assert.equal(listMockFederationTargets(root).length, 2);
      assert.throws(() => listMockFederationServers(root), /Missing public-cypress/);
    });
  });

  it('rejects duplicate ports and names rather than silently omitting remotes', () => {
    withWorkspace(({ root }) => {
      const second = {
        name: '@odh-dashboard/second',
        scripts: {
          'cypress:mock:build': 'true',
          'cypress:mock:build:coverage': 'true',
          'cypress:mock:dev': 'true',
        },
        'module-federation': {
          name: 'second',
          remoteEntry: '/remoteEntry.js',
          local: { port: 9199 },
          service: { name: 'odh-dashboard', port: 8043 },
        },
      };
      writePackage(root, 'packages/second', second);
      assert.throws(() => listMockFederationTargets(root), /port 9199 is shared/);
      second['module-federation'].local.port = 9200;
      second['module-federation'].name = 'demo';
      writePackage(root, 'packages/second', second);
      assert.throws(() => listMockFederationTargets(root), /remote demo is shared/);
      second['module-federation'].local.port = 9001;
      second['module-federation'].name = 'second';
      writePackage(root, 'packages/second', second);
      assert.throws(() => listMockFederationTargets(root), /port 9001 is shared/);
    });
  });

  it('rejects incomplete capability contracts and federation metadata', () => {
    withWorkspace(({ root, demo }) => {
      const pkgPath = path.join(demo, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      delete pkg.scripts['cypress:mock:dev'];
      fs.writeFileSync(pkgPath, JSON.stringify(pkg));
      assert.throws(() => listMockFederationTargets(root), /missing cypress:mock:dev/);
      pkg.scripts['cypress:mock:dev'] = 'true';
      delete pkg['module-federation'].remoteEntry;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg));
      assert.throws(() => listMockFederationTargets(root), /needs a federation name/);
    });
  });
});

describe('listMockFederationServers', () => {
  it('serves only the host and federated modules on their unique configured ports', () => {
    withWorkspace((workspace) => {
      writeBuilds(workspace);
      const servers = listMockFederationServers(workspace.root);
      assert.equal(servers.length, 2);
      assert.equal(servers[0].port, 9001);
      assert.equal(servers[1].moduleName, 'demo');
      assert.deepEqual(getWaitUrls(servers), ['tcp:127.0.0.1:9001', 'tcp:127.0.0.1:9199']);
      assertWaitTargetsReady(servers, workspace.root);
      assert.equal(
        getWaitTargetFilePath(servers[1]),
        path.join(workspace.demo, 'frontend', 'public-cypress', 'remoteEntry.js'),
      );
    });
  });

  it('reports missing remoteEntry.js instead of waiting on an incomplete build', () => {
    withWorkspace((workspace) => {
      writeBuilds(workspace, false);
      assert.throws(
        () => assertWaitTargetsReady(listMockFederationServers(workspace.root), workspace.root),
        /wait targets are missing/,
      );
    });
  });
});

describe('findPublicCypressDir', () => {
  it('does not traverse node_modules', () => {
    withWorkspace(({ root, demo }) => {
      fs.mkdirSync(path.join(demo, 'frontend', 'node_modules', 'ignored'), {
        recursive: true,
      });
      fs.mkdirSync(path.join(demo, 'frontend', 'public-cypress'), { recursive: true });
      assert.equal(
        findPublicCypressDir('packages/demo', root),
        path.join(demo, 'frontend', 'public-cypress'),
      );
    });
  });
});
