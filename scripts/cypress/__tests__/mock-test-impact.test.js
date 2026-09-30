const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { planMockTestImpact } = require('../lib/mock-test-impact');
const { createTestMatrix } = require('../plan-mock-test-impact');

const groups = [
  { name: 'hardware/one', files: ['packages/cypress/cypress/tests/mocked/hardware/one.cy.ts'] },
  { name: 'hardware/two', files: ['packages/cypress/cypress/tests/mocked/hardware/two.cy.ts'] },
  { name: 'observability', files: ['packages/observability/cypress/tests/dashboard.cy.ts'] },
  { name: 'model-serving', files: ['packages/model-serving/cypress/tests/serve.cy.ts'] },
];

const specs = groups.flatMap((group) => group.files);
const dependencyIndex = {
  specs,
  consumers: {
    'packages/cypress/cypress/pages/hardware.ts': specs.slice(0, 2),
    'packages/cypress/cypress/pages/shared.ts': specs,
    'packages/observability/cypress/pages/dashboard.ts': [specs[2]],
  },
  unresolvedCode: [],
  dynamicImports: [],
};

const plan = (changes, index = dependencyIndex) =>
  planMockTestImpact({ groups, changes, dependencyIndex: index });

describe('planMockTestImpact', () => {
  it('proposes no groups for documentation-only changes', () => {
    const result = plan([
      { status: 'M', path: 'docs/testing.md' },
      { status: 'M', path: 'README.md' },
      { status: 'A', path: 'release-notes.adoc' },
      { status: 'M', path: 'packages/observability/docs/overview.md' },
      { status: 'M', path: 'dashboard-operator/AGENTS.md' },
    ]);

    assert.equal(result.scope, 'none');
    assert.deepEqual(result.selectedGroups, []);
    assert.equal(result.excludedGroups.length, groups.length);
  });

  it('maps a changed spec to its existing CI group', () => {
    const result = plan([{ status: 'M', path: specs[2] }]);

    assert.equal(result.scope, 'partial');
    assert.deepEqual(result.selectedGroups, ['observability']);
  });

  it('maps a page object to every transitively importing spec group', () => {
    const result = plan([{ status: 'M', path: 'packages/cypress/cypress/pages/hardware.ts' }]);

    assert.equal(result.scope, 'partial');
    assert.deepEqual(result.selectedGroups, ['hardware/one', 'hardware/two']);
  });

  it('keeps all groups when a global Cypress helper reaches every spec', () => {
    const result = plan([{ status: 'M', path: 'packages/cypress/cypress/pages/shared.ts' }]);

    assert.equal(result.scope, 'full');
    assert.equal(result.selectedGroups.length, groups.length);
  });

  it('keeps all groups for application code outside the proven Cypress graph', () => {
    const result = plan([{ status: 'M', path: 'frontend/src/app/App.tsx' }]);

    assert.equal(result.scope, 'full');
    assert.match(result.reason, /outside the proven Cypress dependency graph/);
  });

  it('keeps all groups for deleted or renamed inputs', () => {
    const result = plan([{ status: 'D', path: specs[0] }]);

    assert.equal(result.scope, 'full');
    assert.match(result.reason, /base-revision dependency graph/);
  });

  it('keeps all groups for selection infrastructure', () => {
    const result = plan([{ status: 'M', path: 'scripts/generate-cypress-test-matrix.js' }]);

    assert.equal(result.scope, 'full');
    assert.match(result.reason, /selection or build infrastructure/);
  });

  it('keeps all groups when a test helper has no known consumers', () => {
    const result = plan([{ status: 'M', path: 'packages/cypress/cypress/pages/orphan.ts' }]);

    assert.equal(result.scope, 'full');
    assert.match(result.reason, /No Cypress consumer/);
  });

  it('keeps all groups for fixtures that may be loaded without imports', () => {
    const result = plan([
      { status: 'M', path: 'packages/cypress/cypress/fixtures/mocked/example.yaml' },
    ]);

    assert.equal(result.scope, 'full');
    assert.match(result.reason, /loaded without an import edge/);
  });

  it('keeps all groups when the graph has unresolved code imports', () => {
    const result = plan([{ status: 'M', path: 'packages/cypress/cypress/pages/hardware.ts' }], {
      ...dependencyIndex,
      unresolvedCode: ['one.cy.ts: ./missing'],
    });

    assert.equal(result.scope, 'full');
    assert.match(result.reason, /unresolved code edges/);
  });
});

describe('createTestMatrix', () => {
  it('exports only selected groups without planner metadata', () => {
    const matrixGroups = [
      {
        name: 'hardware/two',
        spec: 'cypress/two.cy.ts',
        files: ['packages/cypress/two.cy.ts'],
        size: 100,
      },
      {
        name: 'observability',
        spec: 'observability/dashboard.cy.ts',
        files: ['packages/observability/dashboard.cy.ts'],
        size: 200,
      },
    ];

    assert.deepEqual(createTestMatrix(matrixGroups, ['observability']), [
      { name: 'observability', spec: 'observability/dashboard.cy.ts' },
    ]);
  });

  it('exports an empty matrix when no tests are selected', () => {
    assert.deepEqual(createTestMatrix(groups, []), []);
  });
});
