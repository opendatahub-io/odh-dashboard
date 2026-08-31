const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  findPublicCypressDir,
  getWaitUrls,
  listMockFederationServers,
  normalizeModuleFederationConfig,
} = require('../lib/mock-federation-servers');

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

describe('findPublicCypressDir', () => {
  it('finds public-cypress without traversing node_modules', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'odh-cy-'));
    try {
      const workspace = path.join(root, 'packages', 'demo');
      const buildDir = path.join(workspace, 'frontend', 'public-cypress');
      fs.mkdirSync(path.join(workspace, 'frontend', 'node_modules', 'ignored'), {
        recursive: true,
      });
      fs.mkdirSync(buildDir, { recursive: true });

      assert.equal(findPublicCypressDir('packages/demo', root), buildDir);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('listMockFederationServers', () => {
  it('includes host and federated packages with cypress coverage builds', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'odh-cy-'));
    try {
      fs.writeFileSync(
        path.join(root, 'pnpm-workspace.yaml'),
        ['packages:', '  - packages/*', '  - frontend'].join('\n'),
      );
      fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'odh-dashboard' }));
      fs.mkdirSync(path.join(root, 'frontend', 'public-cypress'), { recursive: true });
      fs.writeFileSync(
        path.join(root, 'frontend', 'package.json'),
        JSON.stringify({
          name: 'odh-dashboard-frontend',
          scripts: { 'cypress:server:build:coverage': 'true' },
        }),
      );

      const pkgDir = path.join(root, 'packages', 'demo');
      fs.mkdirSync(path.join(pkgDir, 'frontend', 'public-cypress'), { recursive: true });
      fs.writeFileSync(
        path.join(pkgDir, 'package.json'),
        JSON.stringify({
          name: '@odh-dashboard/demo',
          scripts: { 'cypress:server:build:coverage': 'true' },
          'module-federation': {
            name: 'demo',
            remoteEntry: '/remoteEntry.js',
            local: { host: 'localhost', port: 9199 },
            service: { name: 'odh-dashboard', port: 8043 },
          },
        }),
      );

      const servers = listMockFederationServers(root);
      assert.equal(servers.length, 2);
      assert.equal(servers[0].port, 9001);
      assert.equal(servers[1].moduleName, 'demo');
      assert.equal(servers[1].port, 9199);
      assert.deepEqual(getWaitUrls(servers), [
        'http-get://localhost:9001/',
        'http-get://localhost:9199/remoteEntry.js',
      ]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
