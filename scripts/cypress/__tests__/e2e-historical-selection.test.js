'use strict';

const { it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const history = require('./fixtures/e2e-historical-pr-files.json');
const {
  DEFAULT_TAG,
  buildDependencyIndexForE2e,
  buildSelectionPlan,
  buildSpecInventory,
  discoverCiTags,
  discoverE2eSpecs,
} = require('../lib/e2e-selection');

// Real changed-file lists against today's planner and inventory. These checks
// verify scheduling; they do not recreate old application code or cluster state.
const root = path.resolve(__dirname, '../../..');
const specs = discoverE2eSpecs(root);
const inventory = buildSpecInventory({ root, specs });
const dependencyIndex = buildDependencyIndexForE2e({ root, specs });
const ciTags = discoverCiTags(root);
const plan = (changes) =>
  buildSelectionPlan({
    root,
    changes,
    inventory,
    dependencyIndex,
    ciTags,
    selectedTags: [DEFAULT_TAG],
  });
const replay = (number) => plan(history.prs.find((pr) => pr.number === number).files);
const selected = (result, spec) =>
  result.matrix.some((job) =>
    job.run_mode === 'spec'
      ? job.specs.includes(spec)
      : inventory[spec]?.executableTestTags.some((tags) =>
          tags.some((tag) => job.tag.split(' ').includes(tag)),
        ),
  );
const e2e = 'packages/cypress/cypress/tests/e2e/';

it('replays #10016 without turning an upstream-only mock helper into broad E2E coverage', () => {
  const result = replay(10016);
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.deepEqual(
    result.summary.selectedTags.toSorted(),
    [DEFAULT_TAG, '@ModelCatalogCI', '@ModelRegistryCI'].toSorted(),
  );
  assert.equal(result.matrix.length, 2);
  assert.ok(result.matrix.every((job) => job.run_mode === 'tag'));
  assert.ok(selected(result, `${e2e}modelCatalog/testPerformanceFiltersAvailable.cy.ts`));
  assert.ok(!result.matrix.some((job) => job.tag_dir.startsWith('full-coverage-')));
});

it('replays #9766 manifest-only impact with all three affected pipeline specs selected', () => {
  const result = replay(9766);
  assert.equal(result.valid, true, result.errors.join('\n'));
  for (const tag of ['@Pipelines', '@Workbenches', '@FeatureStoreCI']) {
    assert.ok(result.summary.selectedTags.includes(tag));
  }
  for (const name of [
    'pipelines.cy.ts',
    'createRunDeletePipelineCustomPipMirror.cy.ts',
    'testSchedulePipeline.cy.ts',
  ]) {
    assert.ok(selected(result, `${e2e}pipelines/${name}`));
  }
  assert.ok(result.matrix.every((job) => job.run_mode === 'tag'));
  assert.ok(!result.matrix.some((job) => job.tag_dir.startsWith('full-coverage-')));
});

it('replays #9923 MaaS source changes with API-key and subscription coverage', () => {
  const result = replay(9923);
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.deepEqual(result.summary.selectedTags.toSorted(), [DEFAULT_TAG, '@MaaSCI'].toSorted());
  for (const name of ['testApiKeys.cy.ts', 'testMaaSSubscriptions.cy.ts']) {
    assert.ok(selected(result, `${e2e}maas/${name}`));
  }
  assert.ok(!result.matrix.some((job) => job.tag_dir.startsWith('full-coverage-')));
});

it('replays #9579 changed specs and project-helper consumers', () => {
  const result = replay(9579);
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.ok(
    result.matrix.some((job) =>
      job.specs.includes(`${e2e}settings/servingRuntimes/testSingleServingRuntimeCreation.cy.ts`),
    ),
  );
  assert.ok(selected(result, `${e2e}dataScienceProjects/testProjectCreation.cy.ts`));
});

it('replays #9911, includes legacy Smoke-tagged specs, and rejects an all-skipped required spec', () => {
  const result = replay(9911);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('testSourceEnableDisable.cy.ts')));
  assert.ok(
    result.matrix.some((job) =>
      job.specs.includes(`${e2e}modelCatalog/testCatalogToolCalling.cy.ts`),
    ),
  );
  assert.ok(selected(result, `${e2e}modelCatalog/testPerformanceFiltersAvailable.cy.ts`));
});

it('replays #9945 and rejects the untagged new EvalHub Kueue spec', () => {
  const result = replay(9945);
  assert.equal(result.valid, false);
  assert.ok(result.summary.pathImpactTags.includes('@EvalHubCI'));
  assert.ok(result.errors.some((error) => error.includes('testEvalHubKueue.cy.ts')));
});

it('replays #9783 and rejects the untagged changed AutoRAG metric-variation spec', () => {
  const result = replay(9783);
  assert.equal(result.valid, false);
  assert.ok(result.summary.pathImpactTags.includes('@AutoRAGCI'));
  assert.ok(result.errors.some((error) => error.includes('testAutoragMetricVariations.cy.ts')));
});

it('replays #9776 with explicit regression fallback when no DataConnectHub E2E suite exists', () => {
  const result = replay(9776);
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.deepEqual(result.summary.selectedTags, [DEFAULT_TAG]);
  assert.equal(result.matrix.length, 1);
  // Selection fallback does not establish operator/RBAC deployment coverage.
});

it('selects executable storage-helper consumers with frontend and Smoke tags', () => {
  const result = plan([{ status: 'M', path: 'packages/cypress/cypress/utils/storageClass.ts' }]);
  assert.equal(result.valid, true, result.errors.join('\n'));
  const impacted = result.matrix.filter((job) => job.run_mode === 'spec');
  const expected = [
    `${e2e}dataScienceProjects/workbenches/testWorkbenchStorageClasses.cy.ts`,
    `${e2e}storageClasses/storageClasses.cy.ts`,
  ];
  assert.deepEqual(impacted.flatMap((job) => job.specs).toSorted(), expected.toSorted());
  assert.equal(
    impacted.reduce((count, job) => count + job.planned_test_count, 0),
    expected.reduce((count, spec) => count + inventory[spec].executableTestCount, 0),
  );
  assert.ok(impacted.every((job) => !job.tag_dir.startsWith('full-coverage-')));
});
