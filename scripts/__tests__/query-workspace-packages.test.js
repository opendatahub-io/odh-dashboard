const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { listWorkspacePackagesFromManifest } = require('../query-workspace-packages');

const writePackageJson = (directory, contents) => {
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify(contents));
};

describe('listWorkspacePackagesFromManifest', () => {
  it('uses pnpm workspace patterns and returns full package metadata with relative paths', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'odh-ws-'));
    try {
      fs.writeFileSync(
        path.join(root, 'pnpm-workspace.yaml'),
        ['packages:', "  - 'packages/**'", "  - '!packages/excluded'"].join('\n'),
      );
      writePackageJson(root, { name: 'root', private: true });
      writePackageJson(path.join(root, 'packages', 'alpha'), {
        name: '@test/alpha',
        exports: { './extensions': './extensions.js' },
      });
      writePackageJson(path.join(root, 'packages', 'nested', 'beta'), {
        name: '@test/beta',
        cypress: { mocked: 'tests/mocked/**/*.cy.ts' },
      });
      writePackageJson(path.join(root, 'packages', 'excluded'), { name: '@test/excluded' });

      const packages = listWorkspacePackagesFromManifest(root);

      assert.deepEqual(
        packages.map((pkg) => pkg.name),
        ['root', '@test/alpha', '@test/beta'],
      );
      assert.deepEqual(packages[1].exports, { './extensions': './extensions.js' });
      assert.deepEqual(packages[2].cypress, { mocked: 'tests/mocked/**/*.cy.ts' });
      assert.equal(packages[1].path, 'packages/alpha');
      assert.equal(packages[1].location, 'packages/alpha');
      assert.equal(packages[2].path, 'packages/nested/beta');
      assert.equal(path.resolve(root, packages[2].path), path.join(root, 'packages/nested/beta'));
      assert.equal(
        packages.some((pkg) => pkg.name === '@test/excluded'),
        false,
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
