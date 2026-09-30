const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  createWorkspaceTestIndex,
  resolveWorkspaceFileImpact,
} = require('../lib/workspace-test-impact');

const packages = [
  {
    name: 'odh-dashboard-frontend',
    path: 'frontend',
    dependencies: { '@odh-dashboard/shared': 'workspace:*' },
  },
  {
    name: '@odh-dashboard/observability',
    path: 'packages/observability',
    dependencies: { '@odh-dashboard/shared': 'workspace:*' },
    'module-federation': { name: 'observability' },
  },
  { name: 'observability-ui', path: 'packages/observability/frontend' },
  { name: '@odh-dashboard/shared', path: 'packages/shared' },
];

const groups = [
  { name: 'central/one', owner: 'odh-dashboard-frontend' },
  { name: 'pkg-observability', owner: '@odh-dashboard/observability' },
];

describe('workspace test impact', () => {
  it('connects nested package targets, runtime plugins, and their test owners', () => {
    const index = createWorkspaceTestIndex({ packages, groups });
    const result = resolveWorkspaceFileImpact(index, 'packages/observability/frontend/src/app.tsx');

    assert.deepEqual(result.selectedGroups, ['central/one', 'pkg-observability']);
    assert.deepEqual(result.affectedPackages, [
      '@odh-dashboard/observability',
      'observability-ui',
      'odh-dashboard-frontend',
    ]);
  });

  it('follows reverse workspace dependencies to every affected test owner', () => {
    const index = createWorkspaceTestIndex({ packages, groups });
    const result = resolveWorkspaceFileImpact(index, 'packages/shared/src/index.ts');

    assert.deepEqual(result.selectedGroups, ['central/one', 'pkg-observability']);
    assert.equal(result.affectedPackages.includes('@odh-dashboard/shared'), true);
  });

  it('maps a host source change to every suite that executes against the host', () => {
    const index = createWorkspaceTestIndex({ packages, groups });
    const result = resolveWorkspaceFileImpact(index, 'frontend/src/app.tsx');

    assert.deepEqual(result.selectedGroups, ['central/one', 'pkg-observability']);
  });

  it('rejects files without a workspace owner', () => {
    const index = createWorkspaceTestIndex({ packages, groups });
    const result = resolveWorkspaceFileImpact(index, 'manifests/example.yaml');

    assert.match(result.error, /No workspace owner/);
  });

  it('rejects incomplete group ownership', () => {
    const index = createWorkspaceTestIndex({
      packages,
      groups: [...groups, { name: 'unowned' }],
    });
    const result = resolveWorkspaceFileImpact(index, 'frontend/src/app.tsx');

    assert.match(result.error, /workspace dependency graph is incomplete/);
    assert.match(result.details.join('\n'), /unowned/);
  });
});
