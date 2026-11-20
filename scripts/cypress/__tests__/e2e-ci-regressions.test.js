'use strict';

const { it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const ts = require('typescript');
const Mocha = require('mocha');
const JunitReporter = require('mocha-junit-reporter');
const YAML = require('yaml');
const {
  DEFAULT_TAG,
  buildDependencyIndexForE2e,
  buildSelectionPlan,
  buildSpecInventory,
  discoverE2eSpecs,
  discoverCiTags,
  readPathImpactMap,
} = require('../lib/e2e-selection');
const { summarizeJunitFiles, validateResults } = require('../lib/e2e-results');

const repo = path.resolve(__dirname, '../../..');
const cypress = 'packages/cypress/cypress';
const spec = `${cypress}/tests/e2e/example.cy.ts`;
const pathImpactMap = readPathImpactMap(repo);
const tagDirKey = 'tag_dir';
const plannedTestCountKey = 'planned_test_count';
const sourceFor = (tag) => `it('passes', {tags: ['${tag}']}, () => {});`;
const fixture = (t, files = {}) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-ci-regression-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, contents) => {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents);
  };
  for (const [file, contents] of Object.entries({
    'package.json': JSON.stringify({
      name: 'fixture',
      private: true,
      packageManager: 'pnpm@11.22.0',
    }),
    'pnpm-workspace.yaml': "packages:\n  - 'packages/*'\n",
    ...files,
  })) {
    write(file, contents);
  }
  return { root, write };
};
const inventoryFor = (sources) =>
  buildSpecInventory({
    specs: Object.keys(sources),
    readFile: (file) => sources[path.relative(repo, file)],
  });
const planFor = (options) =>
  buildSelectionPlan({
    changes: [],
    dependencyIndex: { consumers: {} },
    selectedTags: [DEFAULT_TAG],
    ciTags: [DEFAULT_TAG, '@A', '@B', '@SmokeSet1'],
    pathImpactMap,
    workspacePackages: [],
    frontendAreaTags: {},
    ...options,
  });

it('discovers package E2E specs using the complete runtime glob', (t) => {
  const directory = 'packages/new-feature/cypress/tests/e2e';
  const { root, write } = fixture(t, {
    [spec]: sourceFor(DEFAULT_TAG),
    [`${directory}/smoke.cy.ts`]: '',
    [`${directory}/other.cy.ts`]: '',
    [`${directory}/nested/smoke.cy.ts`]: '',
    [`${directory}/.hidden/smoke.cy.ts`]: '',
    [`${directory}/node_modules/dependency/smoke.cy.ts`]: '',
  });
  const cases = [
    ['cypress/tests/e2e/*.cy.ts', ['other.cy.ts', 'smoke.cy.ts']],
    ['cypress/tests/e2e/smoke.cy.ts', ['smoke.cy.ts']],
    [
      'cypress/tests/e2e/**/smoke.cy.ts',
      ['.hidden/smoke.cy.ts', 'nested/smoke.cy.ts', 'smoke.cy.ts'],
    ],
  ];
  for (const [pattern, matches] of cases) {
    write(
      'packages/new-feature/package.json',
      JSON.stringify({
        name: 'new-feature',
        cypress: { e2e: pattern },
        e2eCiTags: ['@A'],
      }),
    );
    assert.deepEqual(
      discoverE2eSpecs(root),
      [spec, ...matches.map((name) => `${directory}/${name}`)].toSorted(),
    );
  }
});

it('does not broaden E2E selection for helpers and fixtures consumed only by mocked specs', (t) => {
  const helper = `${cypress}/utils/mock-only.ts`;
  const data = `${cypress}/fixtures/mock-only.yaml`;
  const { root } = fixture(t, {
    [spec]: sourceFor(DEFAULT_TAG),
    [helper]: 'export const mockOnly = true;',
    [data]: 'name: mock-only',
    [`${cypress}/fixtures/package-only.yaml`]: 'name: package-only',
    [`${cypress}/tests/mocked/mock.cy.ts`]:
      "import '../../utils/mock-only'; cy.fixture('mock-only');",
    'packages/example/package.json':
      '{"name":"example","cypress":{"mocked":"cypress/tests/mocked/*.cy.ts"}}',
    'packages/example/cypress/tests/mocked/example.cy.ts':
      "import '../../../../cypress/cypress/utils/package-only'; cy.fixture('package-only');",
    [`${cypress}/utils/package-only.ts`]: 'export const packageOnly = true;',
  });
  const inventory = inventoryFor({ [spec]: sourceFor(DEFAULT_TAG) });
  const dependencyIndex = buildDependencyIndexForE2e({ root, specs: [spec] });
  for (const file of [
    helper,
    data,
    `${cypress}/utils/package-only.ts`,
    `${cypress}/fixtures/package-only.yaml`,
  ]) {
    const plan = planFor({
      root,
      inventory,
      dependencyIndex,
      changes: [{ status: 'M', path: file }],
    });
    assert.equal(plan.valid, true, plan.errors.join('\n'));
    assert.deepEqual(plan.summary.impactedSpecs, []);
    assert.equal(plan.summary.impactMode, 'none');
    assert.ok(plan.summary.details.some((detail) => /0 executable.*of 1/.test(detail)));
  }
});

it('tracks nested upstream mock consumers with their inherited TypeScript aliases', (t) => {
  const frontend = 'packages/example/upstream/frontend';
  const helper = `${frontend}/src/__tests__/cypress/cypress/pages/catalog.ts`;
  const mock = `${frontend}/src/__tests__/cypress/cypress/tests/mocked/catalog.cy.ts`;
  const { root, write } = fixture(t, {
    [spec]: sourceFor(DEFAULT_TAG),
    'packages/example/package.json': '{"name":"example"}',
    [`${frontend}/tsconfig.json`]: JSON.stringify({
      compilerOptions: { baseUrl: './src', paths: { '~/*': ['./*'] } },
    }),
    [`${frontend}/src/__tests__/cypress/tsconfig.json`]: '{"extends":"../../../tsconfig.json"}',
    [helper]: 'export const catalog = true;',
    [mock]:
      "import { catalog } from '~/__tests__/cypress/cypress/pages/catalog'; import './missing-mock-only';",
  });
  const inventory = inventoryFor({ [spec]: sourceFor(DEFAULT_TAG) });
  const index = buildDependencyIndexForE2e({ root, specs: [spec] });
  assert.deepEqual(index.consumers[helper], [mock]);
  assert.equal(index.unresolvedCode.length, 1);
  assert.deepEqual(index.e2eDiagnostics, { unresolvedCode: [], dynamicImports: [] });
  const plan = planFor({
    root,
    inventory,
    dependencyIndex: index,
    changes: [{ status: 'M', path: helper }],
  });
  assert.equal(plan.valid, true, plan.errors.join('\n'));
  assert.deepEqual(plan.summary.impactedSpecs, []);
  assert.equal(plan.matrix.length, 1);

  // A known mock consumer must not hide an actual E2E import of the same helper.
  write(
    spec,
    `import '${path.posix.relative(path.posix.dirname(spec), helper)}';${sourceFor('@A')}`,
  );
  const sharedIndex = buildDependencyIndexForE2e({ root, specs: [spec] });
  assert.ok(sharedIndex.consumers[helper].includes(spec));
});

it('recognizes frontend CI tags and canonical Smoke/Sanity tags for support impact', (t) => {
  const helper = `${cypress}/utils/storage.ts`;
  const sources = {
    [spec]: sourceFor(DEFAULT_TAG),
    [`${cypress}/tests/e2e/storage.cy.ts`]: sourceFor('@StorageClassesCI'),
    [`${cypress}/tests/e2e/workbench.cy.ts`]: sourceFor('@SmokeSet2'),
    [`${cypress}/tests/e2e/quarantined.cy.ts`]:
      "it('excluded',{tags:['@StorageClassesCI','@Bug']},()=>{});",
  };
  const { root } = fixture(t, {
    ...sources,
    '.github/frontend-ci-tags.json': '{"storageClasses":"@StorageClassesCI"}',
  });
  const ciTags = discoverCiTags(root);
  assert.ok(ciTags.includes('@StorageClassesCI'));
  assert.ok(ciTags.includes('@SmokeSet2'));
  assert.ok(ciTags.includes('@SanitySet3'));
  const consumers = Object.keys(sources).filter((file) => file !== spec);
  const plan = planFor({
    root,
    inventory: inventoryFor(sources),
    ciTags,
    dependencyIndex: { consumers: { [helper]: consumers } },
    changes: [{ status: 'M', path: helper }],
  });
  assert.equal(plan.valid, true, plan.errors.join('\n'));
  assert.deepEqual(
    plan.matrix.find((job) => job.run_mode === 'spec').specs,
    consumers.filter((file) => !file.endsWith('quarantined.cy.ts')).toSorted(),
  );
});

it('fails support selection when E2E consumers can be hidden by unresolved or dynamic imports', (t) => {
  const helper = `${cypress}/utils/shared.ts`;
  const hiddenSpec = `${cypress}/tests/e2e/hidden.cy.ts`;
  for (const hiddenImport of [
    "const helper = '../../utils/shared'; void import(helper);",
    "import '../../utils/missing';",
  ]) {
    const sources = {
      [spec]: sourceFor(DEFAULT_TAG),
      [hiddenSpec]: hiddenImport + sourceFor('@A'),
      [`${cypress}/tests/e2e/known.cy.ts`]: `import '../../utils/shared';${sourceFor('@B')}`,
    };
    const { root } = fixture(t, { ...sources, [helper]: 'export const value = true;' });
    const index = buildDependencyIndexForE2e({ root, specs: Object.keys(sources) });
    assert.ok(index.consumers[helper].length > 0);
    assert.ok(!index.consumers[helper].includes(hiddenSpec));
    for (const file of [helper, `${cypress}/fixtures/shared.yaml`]) {
      const plan = planFor({
        root,
        inventory: inventoryFor(sources),
        dependencyIndex: index,
        changes: [{ status: 'M', path: file }],
      });
      assert.equal(plan.valid, false);
      assert.match(plan.errors.join('\n'), /dependency graph has unresolved or dynamic imports/);
    }
    const docsOnly = planFor({
      root,
      inventory: inventoryFor(sources),
      dependencyIndex: index,
      changes: [{ status: 'M', path: 'docs/notes.md' }],
    });
    assert.equal(docsOnly.valid, true, docsOnly.errors.join('\n'));
    const movedSupport = planFor({
      root,
      inventory: inventoryFor(sources),
      dependencyIndex: index,
      changes: [{ status: 'R', path: 'docs/moved.ts', previousPath: helper }],
    });
    assert.equal(movedSupport.valid, false);
    const explicitSpec = planFor({
      root,
      inventory: inventoryFor(sources),
      dependencyIndex: index,
      changes: [{ status: 'M', path: hiddenSpec }],
    });
    assert.equal(explicitSpec.valid, true, explicitSpec.errors.join('\n'));
  }
});

it('keeps conservative E2E fallback for genuinely unconsumed support files', (t) => {
  const helper = `${cypress}/utils/unknown.ts`;
  const sources = {
    [spec]: sourceFor(DEFAULT_TAG),
    [`${cypress}/tests/e2e/other.cy.ts`]: sourceFor('@A'),
  };
  const { root } = fixture(t, {
    ...sources,
    [helper]: '',
    [`${cypress}/fixtures/unknown.yaml`]: '',
  });
  const dependencyIndex = buildDependencyIndexForE2e({ root, specs: Object.keys(sources) });
  for (const file of [helper, `${cypress}/fixtures/unknown.yaml`]) {
    const plan = planFor({
      root,
      inventory: inventoryFor(sources),
      dependencyIndex,
      changes: [{ status: 'M', path: file }],
    });
    assert.equal(plan.valid, true, plan.errors.join('\n'));
    assert.equal(plan.summary.impactedSpecs.length, 2);
    assert.ok(plan.matrix.some((job) => job.run_mode === 'spec'));
  }
});

it('runs added, modified, and renamed specs explicitly, and rejects deleting sole CI coverage', () => {
  const oldSpec = `${cypress}/tests/e2e/old.cy.ts`;
  const sources = {
    [spec]: sourceFor('@A'),
    [`${cypress}/tests/e2e/default.cy.ts`]: sourceFor(DEFAULT_TAG),
  };
  const inventory = inventoryFor(sources);
  const baseInventory = inventoryFor({ [oldSpec]: sourceFor('@A') });
  for (const status of ['A', 'M', 'R']) {
    const plan = planFor({
      inventory,
      baseInventory,
      changes: [{ status, path: spec, ...(status === 'R' ? { previousPath: oldSpec } : {}) }],
    });
    assert.equal(plan.valid, true, plan.errors.join('\n'));
    assert.deepEqual(plan.matrix.find((job) => job.run_mode === 'spec').specs, [spec]);
  }
  const deleted = planFor({
    inventory: inventoryFor({ [spec]: sourceFor(DEFAULT_TAG) }),
    baseInventory,
    changes: [{ status: 'D', path: oldSpec }],
  });
  assert.equal(deleted.valid, false);
  assert.match(deleted.errors.join('\n'), /only coverage for @A/);
});

it('runs executable changed specs without a CI tag or non-CI registration', () => {
  const defaultSpec = `${cypress}/tests/e2e/default.cy.ts`;
  const oldSpec = `${cypress}/tests/e2e/old.cy.ts`;
  const sources = [
    "it('untagged', () => {});",
    "it('feature flagged', {tags: ['@EvalHub', '@Featureflagged']}, () => {});",
    sourceFor('@Smoke'),
  ];
  for (const source of sources) {
    for (const status of ['A', 'M', 'R']) {
      const plan = planFor({
        inventory: inventoryFor({ [spec]: source, [defaultSpec]: sourceFor(DEFAULT_TAG) }),
        baseInventory: inventoryFor({ [oldSpec]: source }),
        changes: [{ status, path: spec, ...(status === 'R' ? { previousPath: oldSpec } : {}) }],
      });
      assert.equal(plan.valid, true, `${status}: ${plan.errors.join('\n')}`);
      const job = plan.matrix.find((entry) => entry.tag_dir.startsWith('changedspec-'));
      assert.ok(job);
      assert.deepEqual(job.specs, [spec]);
      assert.equal(job.planned_test_count, 1);
      assert.deepEqual(plan.matrix.find((entry) => entry.run_mode === 'tag').specs, [defaultSpec]);
    }
  }

  const explicitOnly = planFor({
    selectedTags: [],
    inventory: inventoryFor({ [spec]: sources[0] }),
    changes: [{ status: 'A', path: spec }],
  });
  assert.equal(explicitOnly.valid, true, explicitOnly.errors.join('\n'));
  assert.equal(explicitOnly.matrix.length, 1);
  assert.equal(explicitOnly.matrix[0].run_mode, 'spec');
  assert.deepEqual(explicitOnly.matrix[0].specs, [spec]);
});

it('schedules the four feature-flagged Eval Hub specs from PR #10596 explicitly', () => {
  const added = [
    'testEvalHubBenchmarkSuiteDuplicate',
    'testEvalHubBenchmarkSuiteEdit',
    'testEvalHubCuratedCollectionCustomize',
    'testEvalHubCuratedCollectionRun',
  ].map((name) => `${cypress}/tests/e2e/eval-hub/${name}.cy.ts`);
  const plan = planFor({
    selectedTags: [DEFAULT_TAG, '@EvalHubCI'],
    ciTags: [DEFAULT_TAG, '@EvalHubCI'],
    inventory: inventoryFor({
      [spec]: sourceFor(DEFAULT_TAG),
      [`${cypress}/tests/e2e/eval-hub/existing.cy.ts`]: sourceFor('@EvalHubCI'),
      ...Object.fromEntries(
        added.map((file) => [
          file,
          "it('runs', {tags: ['@EvalHub', '@Featureflagged']}, () => {});",
        ]),
      ),
    }),
    changes: added.map((file) => ({ status: 'A', path: file })),
  });
  assert.equal(plan.valid, true, plan.errors.join('\n'));
  const job = plan.matrix.find((entry) => entry.tag_dir.startsWith('changedspec-'));
  assert.ok(job);
  assert.deepEqual(job.specs, added.toSorted());
  assert.equal(job.planned_test_count, 4);
  assert.equal(plan.summary.plannedTestCount, 6);
});

it('keeps changed-spec quarantine exclusions and invalid-inventory checks without requiring CI tags', () => {
  const excluded = ['@Bug', '@Maintain', '@NonConcurrent'].map((tag) => sourceFor(tag)).join('\n');
  const cases = [
    { source: `${sourceFor('@Featureflagged')}\n${excluded}`, valid: true, count: 1 },
    { source: excluded, valid: false, error: /has no executable tests/ },
    {
      source: excluded,
      nonCiSpecs: { [spec]: { owner: 'Eval Hub', reason: 'Quarantined tests' } },
      valid: true,
      count: 0,
    },
    { source: '', valid: false, error: /has no executable tests/ },
    { source: "it('unknown', {tags: getTags()}, () => {});", valid: false, error: /unresolved/ },
  ];
  for (const scenario of cases) {
    const plan = planFor({
      inventory: inventoryFor({
        [spec]: scenario.source,
        [`${cypress}/tests/e2e/default.cy.ts`]: sourceFor(DEFAULT_TAG),
      }),
      nonCiSpecs: scenario.nonCiSpecs,
      changes: [{ status: 'A', path: spec }],
    });
    assert.equal(plan.valid, scenario.valid, plan.errors.join('\n'));
    if (scenario.error) {
      assert.match(plan.errors.join('\n'), scenario.error);
    } else {
      assert.equal(
        plan.matrix
          .filter((entry) => entry.run_mode === 'spec')
          .reduce((count, entry) => count + entry.planned_test_count, 0),
        scenario.count,
      );
    }
  }
});

it('limits tag jobs to specs that contain the selected tag', () => {
  const otherSpec = `${cypress}/tests/e2e/other.cy.ts`;
  const plan = planFor({
    inventory: inventoryFor({
      [spec]: sourceFor(DEFAULT_TAG),
      [otherSpec]: sourceFor('@A'),
    }),
  });
  assert.equal(plan.valid, true, plan.errors.join('\n'));
  const job = plan.matrix.find((entry) => entry.run_mode === 'tag' && entry.tag === DEFAULT_TAG);
  assert.ok(job);
  assert.deepEqual(job.specs, [spec]);
});

it('scopes grouped tag jobs to the union of executable matching specs', () => {
  const otherSpec = `${cypress}/tests/e2e/other.cy.ts`;
  const sharedSpec = `${cypress}/tests/e2e/shared.cy.ts`;
  const plan = planFor({
    selectedTags: ['@A', '@B'],
    autoTags: ['@A', '@B'],
    inventory: inventoryFor({
      [spec]: "const tags = ['@A']; describe('suite', {tags}, () => it('one', () => {}));",
      [otherSpec]: sourceFor('@B'),
      [sharedSpec]: "it('both', {tags: ['@A', '@B']}, () => {});",
      [`${cypress}/tests/e2e/unrelated.cy.ts`]: sourceFor(DEFAULT_TAG),
      [`${cypress}/tests/e2e/quarantined.cy.ts`]:
        "it('excluded', {tags: ['@A', '@Bug']}, () => {});",
    }),
  });
  assert.equal(plan.valid, true, plan.errors.join('\n'));
  assert.equal(plan.matrix.length, 1);
  assert.equal(plan.matrix[0].tag, '@A @B');
  assert.deepEqual(plan.matrix[0].specs, [spec, otherSpec, sharedSpec].toSorted());
  assert.equal(plan.matrix[0].planned_test_count, 3);
});

it('scopes impacted-tag jobs to their package CI specs', () => {
  const support = `${cypress}/utils/package-helper.ts`;
  const impacted = Array.from(
    { length: 6 },
    (_, index) => `${cypress}/tests/e2e/pkg-${index}.cy.ts`,
  );
  const plan = planFor({
    ciTags: [DEFAULT_TAG, '@PackageCI', '@B'],
    inventory: inventoryFor({
      [spec]: sourceFor(DEFAULT_TAG),
      ...Object.fromEntries(impacted.map((file) => [file, sourceFor('@PackageCI')])),
      [`${cypress}/tests/e2e/unrelated.cy.ts`]: sourceFor('@B'),
    }),
    dependencyIndex: { consumers: { [support]: impacted } },
    changes: [{ status: 'M', path: support }],
  });
  assert.equal(plan.valid, true, plan.errors.join('\n'));
  assert.equal(plan.summary.impactMode, 'ci-tags');
  const job = plan.matrix.find((entry) => entry.tag_dir.startsWith('impacted-tag-'));
  assert.ok(job);
  assert.equal(job.tag, '@PackageCI');
  assert.deepEqual(job.specs, impacted);
  assert.equal(job.planned_test_count, 6);
});

it('preserves residual impacted specs and gives broad tag jobs the full execution budget', () => {
  const sources = { [spec]: sourceFor(DEFAULT_TAG) };
  for (let index = 0; index < 7; index += 1) {
    sources[`${cypress}/tests/e2e/broad-${index}.cy.ts`] = sourceFor(
      index === 6 ? '@A' : '@SmokeSet1',
    );
  }
  const inventory = inventoryFor(sources);
  const support = `${cypress}/support/shared.ts`;
  for (const status of ['D', 'M']) {
    const plan = planFor({
      inventory,
      dependencyIndex: { consumers: { [support]: Object.keys(sources) } },
      changes: [{ status, path: support }],
    });
    assert.equal(plan.valid, true, plan.errors.join('\n'));
    assert.equal(plan.summary.impactMode, 'full-coverage-tags');
    const fullCoverageJob = plan.matrix.find((job) => job.tag_dir.startsWith('full-coverage-'));
    assert.ok(fullCoverageJob);
    assert.equal(fullCoverageJob.planned_test_count, 6);
    assert.deepEqual(
      fullCoverageJob.specs,
      Array.from({ length: 6 }, (_, index) => `${cypress}/tests/e2e/broad-${index}.cy.ts`),
    );
    assert.ok(plan.matrix.some((job) => job.specs.includes(`${cypress}/tests/e2e/broad-6.cy.ts`)));
    assert.ok(plan.matrix.every((job) => job.timeout === 360));
  }
});

it('passes scoped specs and runtime filters through the workflow command', () => {
  const workflow = YAML.parse(
    fs.readFileSync(path.join(repo, '.github/workflows/cypress-e2e-test.yml'), 'utf8'),
  );
  const runBrowser = workflow.jobs['e2e-tests'].steps.find((step) => step.name === 'Run E2E Tests');
  const start = runBrowser.run.indexOf('SKIP_TAGS_GREP=');
  const end = runBrowser.run.indexOf('export CYPRESS_video=true');
  assert.ok(start >= 0 && end > start, 'Workflow must retain its command-construction block');
  const command = runBrowser.run.slice(start, end);
  // Supply Bash 4's mapfile when running these Linux workflow checks on macOS Bash 3.
  const mapfileAdapter = `
    if ! type mapfile >/dev/null 2>&1; then
      mapfile() {
        local line
        [[ "$1" == "-t" && "$2" == "SPEC_PATHS" ]] || return 2
        SPEC_PATHS=()
        while IFS= read -r line; do SPEC_PATHS+=("$line"); done
      }
    fi
  `;
  const capture = `
    pnpm() {
      "$TEST_NODE_EXECUTABLE" -e 'console.log(JSON.stringify({
        args: process.argv.slice(1),
        grepTags: process.env.CYPRESS_grepTags,
        grepFilterSpecs: process.env.CYPRESS_grepFilterSpecs
      }))' -- "$@"
    }
    eval "$CYPRESS_COMMAND"
  `;
  const otherSpec = `${cypress}/tests/e2e/other.cy.ts`;
  const skipTags = '--@Bug --@Maintain --@NonConcurrent';
  const cases = [
    { name: 'tag job', mode: 'tag', tag: '@A', specs: [spec], grepTags: `@A ${skipTags}` },
    {
      name: 'grouped tag job',
      mode: 'tag',
      tag: '@A @B',
      specs: [spec, otherSpec],
      grepTags: `@A @B ${skipTags}`,
    },
    {
      name: 'explicit spec job',
      mode: 'spec',
      tag: '@ChangedSpec-01',
      specs: [spec, otherSpec],
      grepTags: skipTags,
    },
    { name: 'empty explicit selection', mode: 'spec', specs: [], error: /has no specs/ },
    { name: 'null explicit selection', mode: 'spec', specs: null, error: /has no specs/ },
    {
      name: 'unsafe tag-job path',
      mode: 'tag',
      tag: '@A',
      specs: ['unsafe;path.cy.ts'],
      error: /Invalid spec path/,
    },
    {
      name: 'unsafe explicit-spec path',
      mode: 'spec',
      specs: ['unsafe;path.cy.ts'],
      error: /Invalid spec path/,
    },
  ];
  for (const scenario of cases) {
    const result = spawnSync(
      'bash',
      ['-e', '-o', 'pipefail', '-c', mapfileAdapter + command + capture],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          TEST_NODE_EXECUTABLE: process.execPath,
          GITHUB_WORKSPACE: '/workspace/dashboard with spaces',
          MATRIX_RUN_MODE: scenario.mode,
          MATRIX_TAG: scenario.tag ?? '',
          MATRIX_SPECS: JSON.stringify(scenario.specs),
        },
      },
    );
    assert.equal(result.status, scenario.error ? 1 : 0, `${scenario.name}: ${result.stderr}`);
    if (scenario.error) {
      assert.match(result.stdout, scenario.error, scenario.name);
      continue;
    }
    const actual = JSON.parse(result.stdout.trim().split('\n').at(-1));
    assert.deepEqual(
      actual.args,
      [
        '--filter',
        'odh-dashboard-frontend',
        'cypress:run:chrome',
        '--spec',
        scenario.specs.map((file) => `/workspace/dashboard with spaces/${file}`).join(','),
      ],
      scenario.name,
    );
    assert.equal(actual.grepTags, scenario.grepTags, scenario.name);
    assert.equal(actual.grepFilterSpecs, 'false', scenario.name);
  }
});

it('selects only the owning package CI tags plus default regression for package source changes', () => {
  const inventory = inventoryFor({
    [spec]: sourceFor(DEFAULT_TAG),
    [`${cypress}/tests/e2e/mr.cy.ts`]: sourceFor('@ModelRegistryCI'),
    [`${cypress}/tests/e2e/other.cy.ts`]: sourceFor('@OtherCI'),
  });
  const plan = planFor({
    inventory,
    ciTags: [DEFAULT_TAG, '@ModelRegistryCI', '@OtherCI'],
    workspacePackages: [
      { name: 'model-registry', path: 'packages/model-registry', e2eCiTags: ['@ModelRegistryCI'] },
    ],
    changes: [{ status: 'M', path: 'packages/model-registry/src/example.ts' }],
  });
  assert.equal(plan.valid, true, plan.errors.join('\n'));
  assert.deepEqual(
    plan.summary.selectedTags.toSorted(),
    [DEFAULT_TAG, '@ModelRegistryCI'].toSorted(),
  );
  assert.equal(
    plan.matrix.reduce((count, job) => count + job.planned_test_count, 0),
    2,
  );
});

it('resolves literal tag options and rejects ambiguous selected test counts', () => {
  const inventory = inventoryFor({
    [spec]: `const options = {tags: ['@A']}; describe('suite', options, () => it('one', () => {}));`,
  });
  const literal = planFor({ inventory, selectedTags: ['@A'] });
  assert.equal(literal.valid, true, literal.errors.join('\n'));
  assert.equal(literal.summary.plannedTestCount, 1);
  const ambiguous = planFor({
    inventory: inventoryFor({
      [spec]: `describe('suite', {tags: getTags()}, () => it('one', () => {}));`,
    }),
    selectedTags: ['@A'],
  });
  assert.equal(ambiguous.valid, false);
  assert.match(ambiguous.errors.join('\n'), /unresolved test or suite tags/);
});

it('matches planner counts to real Mocha registration and JUnit for inherited, excluded, static and runtime skips', async (t) => {
  const { root } = fixture(t);
  const helperFile = path.join(repo, 'packages/cypress/cypress/support/testTags.ts');
  const helper = {};
  vm.runInThisContext(
    `(function(exports) { ${
      ts.transpileModule(fs.readFileSync(helperFile, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      }).outputText
    }\n})`,
    { filename: helperFile },
  )(helper);
  const report = path.join(root, 'junit.xml');
  const mocha = new Mocha({
    reporter: JunitReporter,
    reporterOptions: { mochaFile: report, includePending: true },
  });
  const context = {};
  mocha.suite.emit('pre-require', context, 'fixture.cy.ts', mocha);
  // Only adapt Cypress's options argument; keep real Mocha registration and reporting.
  const adapt = (original) =>
    Object.assign(
      (title, optionsOrFn, fn) =>
        original(title, typeof optionsOrFn === 'object' ? fn : optionsOrFn),
      original,
    );
  for (const name of ['it', 'describe', 'context']) {
    const original = context[name];
    context[name] = adapt(original);
    context[name].only = adapt(original.only);
    context[name].skip = adapt(original.skip);
  }
  const { shouldSkipTest } = helper.createTestTagFilter(['@A', '--@Excluded'], ['@Bug']);
  const registeredTags = {};
  helper.installTestTagFilter(context, shouldSkipTest, (registered, tags) => {
    registeredTags[registered.fullTitle()] = tags;
  });
  const source = `
    const selectedTags = ['@A'];
    const options = {tags: selectedTags};
    describe('selected', options, () => {
      context('nested', {tags: ['@B']}, () => it('same title', () => {}));
      it('runtime skip', function () { this.skip(); });
      it('bug', {tags: ['@Bug']}, () => { throw Error('excluded'); });
      it('excluded', {tags: ['@Excluded']}, () => { throw Error('excluded'); });
      it.skip('static skip', () => {});
      describe.skip('static suite', () => context('nested', () => it('omitted', () => {})));
    });
    describe('not selected', {tags: ['@B']}, () => it('same title', () => { throw Error('excluded'); }));
  `;
  vm.runInNewContext(source, context);
  const failures = await new Promise((resolve) => {
    mocha.run(resolve);
  });
  assert.equal(failures, 0);
  const inventory = buildSpecInventory({
    specs: [spec],
    readFile: () => source,
    skipTags: ['@Bug', '@Excluded'],
  });
  const plan = planFor({ inventory, selectedTags: ['@A'] });
  assert.equal(plan.valid, true, plan.errors.join('\n'));
  const totals = summarizeJunitFiles([report]);
  assert.deepEqual(totals, { tests: 2, failures: 0, skipped: 1, executed: 1 });
  assert.equal(validateResults(totals, plan.summary.plannedTestCount), null);
  assert.deepEqual(Object.keys(registeredTags), [
    'selected nested same title',
    'selected runtime skip',
  ]);
});

it('rejects missing, empty, skipped, mismatched, and failing per-job reports in downloaded artifact layouts', (t) => {
  const cli = path.join(repo, 'scripts/cypress/summarize-e2e-results.js');
  const cases = [
    { name: 'complete', xml: '<testcase name="pass"/>', expected: 1, status: 0 },
    {
      name: 'present',
      xml: '<testcase/>',
      expected: 1,
      missing: true,
      error: /No JUnit XML files.*missing/,
    },
    { name: 'empty', xml: '', expected: 1, error: /No Cypress tests executed/ },
    {
      name: 'skipped',
      xml: '<testcase><skipped/></testcase>',
      expected: 1,
      error: /Every selected Cypress test was skipped/,
    },
    { name: 'mismatch', xml: '<testcase/>', expected: 2, error: /Coverage differs from plan/ },
    {
      name: 'failed',
      xml: '<testcase><failure/></testcase>',
      expected: 1,
      error: /1 Cypress test\(s\) failed/,
    },
    {
      name: 'incomplete-and-failed',
      xml: '<testcase><failure/></testcase>',
      expected: 2,
      error: /Coverage differs from plan.*1 Cypress test\(s\) failed/,
    },
  ];
  for (const scenario of cases) {
    const { root } = fixture(t, {
      [`artifacts/cypress-results-${scenario.name}/results/${scenario.name}/junit-report.xml`]: `<testsuite>${scenario.xml}</testsuite>`,
      // A raw report alongside the merged report must not be counted twice.
      [`artifacts/cypress-results-${scenario.name}/results/${scenario.name}/raw.xml`]:
        '<testcase/>',
    });
    const matrix = [{ [tagDirKey]: scenario.name, [plannedTestCountKey]: scenario.expected }];
    if (scenario.missing) matrix.push({ [tagDirKey]: 'missing', [plannedTestCountKey]: 1 });
    const result = spawnSync(
      process.execPath,
      [
        cli,
        '--results-dir',
        path.join(root, 'artifacts'),
        '--matrix-json',
        JSON.stringify(matrix),
        '--summary-json',
        path.join(root, 'summary.json'),
        '--summary-md',
        path.join(root, 'summary.md'),
      ],
      { encoding: 'utf8' },
    );
    assert.equal(result.status, scenario.status ?? 1, result.stderr);
    const summary = JSON.parse(fs.readFileSync(path.join(root, 'summary.json'), 'utf8'));
    assert.equal(summary.tests, scenario.name === 'empty' ? 0 : 1);
    if (scenario.error) {
      assert.match(summary.validationErrors.join('\n'), scenario.error);
      assert.match(fs.readFileSync(path.join(root, 'summary.md'), 'utf8'), /Validation failures/);
    }
  }
});

it('keeps the deprecated dispatch input accepted and runs regressions in the existing orchestration job', () => {
  const workflow = YAML.parse(
    fs.readFileSync(path.join(repo, '.github/workflows/cypress-e2e-test.yml'), 'utf8'),
  );
  assert.equal(workflow.on.workflow_dispatch.inputs.skip_auto_detect.type, 'boolean');
  const selectionStep = workflow.jobs['get-test-tags'].steps.find(
    (step) => step.env?.INPUT_SKIP_AUTO_DETECT,
  );
  assert.match(selectionStep.run, /skip_auto_detect is deprecated and ignored/);
  assert.doesNotMatch(selectionStep.run, /--skip-auto-detect/);
  assert.equal(selectionStep.env.PLAN_BASE_SHA, '${{ steps.refs.outputs.base_sha }}');
  assert.equal(selectionStep.env.PLAN_HEAD_SHA, '${{ steps.refs.outputs.head_sha }}');
  assert.match(selectionStep.run, /--base "\$PLAN_BASE_SHA"/);
  assert.match(selectionStep.run, /--head "\$PLAN_HEAD_SHA"/);
  assert.doesNotMatch(selectionStep.run, /\$\{\{\s*steps\.refs\.outputs/);
  assert.equal(workflow.jobs['validate-selection'], undefined);
  assert.deepEqual(workflow.jobs['get-test-tags'].permissions, {
    contents: 'read',
    'pull-requests': 'read',
    actions: 'read',
  });
  const runBrowser = workflow.jobs['e2e-tests'].steps.find((step) => step.name === 'Run E2E Tests');
  assert.doesNotMatch(runBrowser.run, /CYPRESS_grepFilterSpecs=true/);
  assert.match(runBrowser.run, /CYPRESS_grepFilterSpecs=false/);
  const checks = YAML.parse(
    fs.readFileSync(path.join(repo, '.github/workflows/cypress-mock-orchestration.yml'), 'utf8'),
  );
  assert.deepEqual(Object.keys(checks.jobs), ['validate']);
  assert.ok(
    checks.jobs.validate.steps.some((step) =>
      step.run?.includes('node --test scripts/cypress/__tests__/*.test.js'),
    ),
  );
  assert.ok(checks.on.pull_request.paths.includes('packages/cypress/cypress/support/testTags.ts'));
});
