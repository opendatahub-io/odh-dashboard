const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { dependencyRoots, planDistributionImpact } = require('../lib/distribution-test-impact');

const portal = '@odh-dashboard/maas-portal-distribution';
const rhaii = '@odh-dashboard/rhaii-distribution';
const packages = [
  { name: portal, path: 'distributions/maas-portal', dependencies: { maas: 'workspace:*' } },
  { name: 'maas', path: 'packages/maas', dependencies: { shared: 'workspace:*' } },
  { name: 'maas-ui', path: 'packages/maas/frontend', devDependencies: { tooling: 'workspace:*' } },
  { name: 'shared', path: 'packages/shared', peerDependencies: { maas: '*' } },
  { name: 'tooling', path: 'packages/tooling' },
  { name: 'unrelated', path: 'packages/unrelated' },
];
const plan = (file, extra = {}) =>
  planDistributionImpact({
    target: portal,
    changes: [{ status: 'M', path: file }],
    packages,
    ...extra,
  });

describe('distribution workspace impact selection', () => {
  for (const file of [
    'distributions/maas-portal/src/index.tsx',
    'distributions/maas-portal/src/__tests__/cypress/tests/mocked/keys.cy.ts',
    'packages/maas/frontend/src/page.tsx',
    'packages/shared/style.scss',
    'packages/tooling/config.js',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    '.github/workflows/test.yml',
    'scripts/cypress/plan-mock-test-applications.js',
  ]) {
    it(`runs for ${file}`, () => assert.equal(plan(file).run, true));
  }

  for (const file of ['packages/unrelated/src/page.tsx', 'packages/maas-other/index.ts']) {
    it(`skips unrelated ${file}`, () => assert.equal(plan(file).run, false));
  }

  it('skips documentation even inside a dependency', () => {
    assert.equal(plan('packages/maas/docs/testing.md').run, false);
  });

  it('handles cycles and reports the transitive dependency chain', () => {
    assert.equal(dependencyRoots(packages, portal).size, 5);
    assert.match(plan('packages/shared/index.ts').reason, /maas -> shared/);
  });

  it('discovers new dependencies without another path rule', () => {
    const updated = packages.map((pkg) =>
      pkg.name === 'maas' ? { ...pkg, dependencies: { unrelated: 'workspace:*' } } : pkg,
    );
    assert.equal(plan('packages/unrelated/index.ts', { packages: updated }).run, true);
  });

  it('selects dependencies removed from the current graph using the base graph', () => {
    const updated = packages.map((pkg) =>
      pkg.name === portal ? { ...pkg, dependencies: {} } : pkg,
    );
    assert.equal(
      plan('packages/maas/index.ts', { packages: updated, basePackages: packages }).run,
      true,
    );
  });

  it('selects both sides of renamed/deleted dependency sources', () => {
    assert.equal(
      planDistributionImpact({
        target: portal,
        packages,
        changes: [
          { status: 'R', path: 'packages/shared/old.ts' },
          { status: 'R', path: 'packages/unrelated/new.ts' },
        ],
      }).run,
      true,
    );
    assert.equal(
      planDistributionImpact({
        target: portal,
        packages,
        changes: [{ status: 'D', path: 'packages/shared/deleted.ts' }],
      }).run,
      true,
    );
  });

  it('runs conservatively without changes and rejects unresolved workspace dependencies', () => {
    assert.equal(planDistributionImpact({ target: portal, packages, changes: [] }).run, true);
    assert.throws(() => dependencyRoots(packages.slice(0, 1), portal), /not found|Unresolved/);
  });
});

describe('multiple distribution targets', () => {
  const targetPackages = [
    ...packages,
    { name: rhaii, path: 'distributions/rhaii', dependencies: { unrelated: 'workspace:*' } },
  ];

  for (const [target, file, expected] of [
    [portal, 'packages/maas/frontend/src/page.tsx', true],
    [rhaii, 'packages/maas/frontend/src/page.tsx', false],
    [portal, 'packages/unrelated/src/page.tsx', false],
    [rhaii, 'packages/unrelated/src/page.tsx', true],
    [rhaii, 'distributions/rhaii/src/index.tsx', true],
    [portal, 'distributions/rhaii/src/index.tsx', false],
  ]) {
    it(`${target} selects ${file}: ${expected}`, () => {
      assert.equal(plan(file, { target, packages: targetPackages }).run, expected);
    });
  }

  it('follows transitive dependencies of another distribution through a nested frontend', () => {
    const nestedPackages = [
      ...targetPackages,
      {
        name: 'rhaii-ui',
        path: 'distributions/rhaii/frontend',
        devDependencies: { tooling: 'workspace:*' },
      },
    ];
    const result = plan('packages/tooling/config.js', { target: rhaii, packages: nestedPackages });
    assert.equal(result.run, true);
    assert.match(result.reason, /rhaii-distribution -> rhaii-ui -> tooling/);
  });

  it('preserves removed dependencies for another distribution using its base graph', () => {
    const updated = targetPackages.map((pkg) =>
      pkg.name === rhaii ? { ...pkg, dependencies: {} } : pkg,
    );
    assert.equal(
      plan('packages/unrelated/deleted.ts', {
        target: rhaii,
        packages: updated,
        basePackages: targetPackages,
      }).run,
      true,
    );
  });

  it('accepts a new distribution without a built-in target registration', () => {
    const target = '@example/new-distribution';
    const newPackages = [
      ...packages,
      {
        name: target,
        path: 'distributions/new',
        dependencies: { unrelated: 'workspace:*' },
      },
    ];
    assert.equal(plan('packages/unrelated/index.ts', { target, packages: newPackages }).run, true);
    assert.equal(plan('packages/maas/index.ts', { target, packages: newPackages }).run, false);
  });

  it('requires a target even for documentation-only changes', () => {
    assert.throws(
      () =>
        planDistributionImpact({
          packages,
          changes: [{ status: 'M', path: 'README.md' }],
        }),
      /target workspace package is required/,
    );
  });
});
