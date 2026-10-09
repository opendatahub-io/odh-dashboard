const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { buildDependencyIndex, planMockTestImpact } = require('../lib/mock-test-impact');
const { createTestMatrix, parseArgs, sanitizeLogText } = require('../plan-mock-test-impact');

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

const createGraphFixture = (t, files) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cypress-impact-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const [relativePath, contents] of Object.entries(files)) {
    const absolutePath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, contents);
  }
  return root;
};

describe('buildDependencyIndex', () => {
  it('maps transitive helpers and support dependencies to every consuming spec', (t) => {
    const root = createGraphFixture(t, {
      'tests/one.cy.ts': "import '../pages/one';\n",
      'tests/two.cy.ts': "import '../pages/two';\n",
      'pages/one.ts': "export { value } from '../shared/transitive';\n",
      'pages/two.ts': 'export const two = true;\n',
      'shared/transitive.ts': 'export const value = true;\n',
      'support/e2e.ts': "import '../shared/global';\n",
      'shared/global.ts': 'export const global = true;\n',
    });

    const index = buildDependencyIndex({
      root,
      specs: ['tests/one.cy.ts', 'tests/two.cy.ts'],
      supportFile: 'support/e2e.ts',
    });

    assert.deepEqual(index.consumers['shared/transitive.ts'], ['tests/one.cy.ts']);
    assert.deepEqual(index.consumers['shared/global.ts'], ['tests/one.cy.ts', 'tests/two.cy.ts']);
    assert.deepEqual(index.unresolvedCode, []);
    assert.deepEqual(index.dynamicImports, []);
  });

  it('reports unresolved and nonliteral dynamic imports for fail-full planning', (t) => {
    const root = createGraphFixture(t, {
      'tests/example.cy.ts': [
        "import './missing';",
        "const helper = './helper';",
        'void import(helper);',
      ].join('\n'),
      'support/e2e.ts': '',
    });

    const index = buildDependencyIndex({
      root,
      specs: ['tests/example.cy.ts'],
      supportFile: 'support/e2e.ts',
    });

    assert.deepEqual(index.unresolvedCode, ['tests/example.cy.ts: ./missing']);
    assert.equal(index.dynamicImports.length, 1);
    assert.match(index.dynamicImports[0], /tests\/example\.cy\.ts: import\(helper\)/);
  });
});

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

  it('treats runtime files inside docs directories as application code', () => {
    const result = plan([{ status: 'M', path: 'backend/src/routes/api/docs/handler.ts' }]);

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

describe('parseArgs', () => {
  it('allows an explicitly empty base so the CLI can use the head parent', () => {
    assert.deepEqual(parseArgs(['--base', '', '--head', 'HEAD']), {
      base: '',
      head: 'HEAD',
    });
  });
});

describe('sanitizeLogText', () => {
  it('keeps path-derived reasons on one non-command line', () => {
    assert.equal(
      sanitizeLogText('Changed path:\n::warning::unsafe\rnext'),
      'Changed path: : :warning: :unsafe next',
    );
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
      { name: 'shard-01', specs: ['../packages/observability/dashboard.cy.ts'] },
    ]);
  });

  it('caps selected groups while retaining every original selector', () => {
    const matrixGroups = Array.from({ length: 15 }, (_, index) => ({
      name: `group-${index}`,
      spec: `cypress/group-${index}.cy.ts`,
      files: [`packages/cypress/group-${index}.cy.ts`],
      size: index + 1,
    }));

    const matrix = createTestMatrix(
      matrixGroups,
      matrixGroups.map((group) => group.name),
    );

    assert.equal(matrix.length, 12);
    assert.deepEqual(
      matrix.flatMap((shard) => shard.specs).toSorted(),
      matrixGroups.map((group) => `../packages/${group.spec}`).toSorted(),
    );
  });

  it('exports an empty matrix when no tests are selected', () => {
    assert.deepEqual(createTestMatrix(groups, []), []);
  });
});
