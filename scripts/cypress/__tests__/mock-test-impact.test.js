const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { planMockTestImpact } = require('../lib/mock-test-impact');
const { toMarkdown } = require('../plan-mock-test-impact');

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

  it('keeps all groups for application code without a trusted coverage mapping', () => {
    const result = plan([{ status: 'M', path: 'frontend/src/app/App.tsx' }]);

    assert.equal(result.scope, 'full');
    assert.match(result.reason, /no trusted per-spec coverage mapping/);
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

describe('toMarkdown', () => {
  it('states that the proposal does not skip the full matrix', () => {
    const result = plan([{ status: 'M', path: specs[2] }]);
    const markdown = toMarkdown(result, {
      base: 'base-sha',
      head: 'head-sha',
      totalGroups: groups.length,
    });

    assert.match(markdown, /observation only/);
    assert.match(markdown, /CI still runs the complete Cypress mock matrix/);
    assert.match(markdown, /Selected:\*\* 1\/4 groups/);
  });
});
