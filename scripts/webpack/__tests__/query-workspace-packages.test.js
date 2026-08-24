const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  expandPattern,
  listWorkspacePackagesFromManifest,
} = require('../../query-workspace-packages');

describe('expandPattern', () => {
  it('throws for unsupported ** globs', () => {
    assert.throws(
      () => expandPattern('/repo', 'packages/**/frontend'),
      /Unsupported workspace glob/,
    );
  });
});

describe('listWorkspacePackagesFromManifest', () => {
  it('emits repo-relative path/location and resolves absolute package dirs', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'odh-ws-'));
    try {
      fs.writeFileSync(
        path.join(root, 'pnpm-workspace.yaml'),
        ['packages:', '  - packages/*'].join('\n'),
      );
      fs.mkdirSync(path.join(root, 'packages', 'alpha'), { recursive: true });
      fs.writeFileSync(
        path.join(root, 'packages', 'alpha', 'package.json'),
        JSON.stringify({ name: '@test/alpha' }),
      );
      fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'root' }));

      const packages = listWorkspacePackagesFromManifest(root);
      const alpha = packages.find((pkg) => pkg.name === '@test/alpha');

      assert.ok(alpha);
      assert.equal(alpha.path, 'packages/alpha');
      assert.equal(alpha.location, 'packages/alpha');
      assert.equal(path.resolve(root, alpha.path), path.join(root, 'packages', 'alpha'));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
