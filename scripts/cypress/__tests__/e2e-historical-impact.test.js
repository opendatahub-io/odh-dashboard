'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  buildDependencyIndexForE2e,
  buildSelectionPlan,
  buildSpecInventory,
  discoverCiTags,
  discoverE2eSpecs,
} = require('../lib/e2e-selection');

const root = path.resolve(__dirname, '../../..');
const specs = discoverE2eSpecs(root);
const inventory = buildSpecInventory({ specs, root });
const ciTags = discoverCiTags(root);
const dependencyIndex = buildDependencyIndexForE2e({ root, specs });

const planForHistory = (changes) =>
  buildSelectionPlan({
    changes,
    inventory,
    dependencyIndex,
    selectedTags: [],
    ciTags,
    root,
  });

const pr9766Files = [
  'manifests/base/kustomization.yaml',
  'manifests/base/networkpolicy.yaml',
  'manifests/distributions/maas-portal/networkpolicy.yaml',
  'manifests/modules/agent-ops/networkpolicy.yaml',
  'manifests/modules/automl/networkpolicy.yaml',
  'manifests/modules/autorag/networkpolicy.yaml',
  'manifests/modules/data-registry/networkpolicy.yaml',
  'manifests/modules/eval-hub/networkpolicy.yaml',
  'manifests/modules/gen-ai/networkpolicy.yaml',
  'manifests/modules/maas/networkpolicy.yaml',
  'manifests/modules/mlflow/networkpolicy.yaml',
  'manifests/modules/model-registry/networkpolicy.yaml',
  'manifests/modules/notebooks/networkpolicy.yaml',
  'manifests/rhoai/kustomization.yaml',
  'manifests/rhoai/networkpolicy.yaml',
].map((filePath) => ({ status: 'M', path: filePath }));

const pr9783Files = [
  '.github/scripts/mask-cypress-test-secrets.sh',
  'manifests/modules/autorag/networkpolicy.yaml',
  'packages/autox-core/services/pipelines/cache.go',
  'packages/autox-core/services/pipelines/client.go',
  'packages/autox-core/services/pipelines/client_test.go',
  'packages/autox-core/services/pipelines/errors.go',
  'packages/autox-core/services/pipelines/models.go',
  'packages/autox-core/services/pipelines/service.go',
  'packages/autox-core/services/pipelines/service_test.go',
  'packages/cypress/cypress/fixtures/resources/autorag/pgvector-standalone.yaml',
  'packages/cypress/cypress/pages/autorag/configurePage.ts',
  'packages/cypress/cypress/pages/autorag/resultsPage.ts',
  'packages/cypress/cypress/tests/e2e/autorag/testAutoragExperimentsAndRunManagement.cy.ts',
  'packages/cypress/cypress/tests/e2e/autorag/testAutoragMetricVariations.cy.ts',
  'packages/cypress/cypress/tests/e2e/autorag/testAutoragOptimization.cy.ts',
  'packages/cypress/cypress/types.ts',
  'packages/cypress/cypress/utils/autoragTestFlows.ts',
  'packages/cypress/cypress/utils/maskSensitiveInfo.ts',
  'packages/cypress/cypress/utils/oc_commands/autoragInfra.ts',
  'packages/cypress/cypress/utils/oc_commands/maasSecret.ts',
  'packages/cypress/cypress/utils/oc_commands/ogxNetworkPolicy.ts',
  'packages/cypress/cypress/utils/testConfig.ts',
  'packages/cypress/test-variables.yml.example',
].map((filePath) => ({ status: 'M', path: filePath }));

describe('historical E2E impact simulations', () => {
  it('maps the escaped PR #9766 network-policy change without scheduling every spec', () => {
    const result = planForHistory(pr9766Files);
    const totalExecutableTests = Object.values(inventory).reduce(
      (total, entry) => total + entry.executableTestCount,
      0,
    );

    assert.equal(result.valid, true);
    assert.deepEqual(result.summary.unmatchedImpactfulPaths, []);
    assert.deepEqual(result.summary.coverageGaps, []);
    for (const tag of ['@FeatureStoreCI', '@Pipelines', '@Workbenches']) {
      assert.ok(result.summary.pathImpactTags.includes(tag));
    }
    assert.ok(result.matrix.length > 0);
    assert.ok(result.matrix.every((job) => job.run_mode === 'tag'));
    assert.ok(result.summary.plannedTestCount > 0);
    assert.ok(result.summary.plannedTestCount < totalExecutableTests);
  });

  it('maps the historical Model Catalog support change to its formerly missed CI specs', () => {
    const result = planForHistory([
      {
        status: 'M',
        path: 'packages/cypress/cypress/utils/oc_commands/modelCatalog.ts',
      },
    ]);

    assert.equal(result.valid, true);
    assert.ok(
      result.summary.impactedSpecs.includes(
        'packages/cypress/cypress/tests/e2e/modelCatalog/testPerformanceFiltersAvailable.cy.ts',
      ),
    );
    assert.ok(
      result.summary.impactedSpecs.includes(
        'packages/cypress/cypress/tests/e2e/modelCatalog/testCatalogDeployModel.cy.ts',
      ),
    );
    assert.ok(result.summary.impactedSpecs.length > 0);
  });

  it('schedules changed Model Catalog specs that previously carried only base tags', () => {
    const changedSpecs = [
      'packages/cypress/cypress/tests/e2e/modelCatalog/testPerformanceFiltersAvailable.cy.ts',
      'packages/cypress/cypress/tests/e2e/modelCatalog/testCatalogDeployModel.cy.ts',
    ];
    const result = planForHistory(
      changedSpecs.map((specPath) => ({ status: 'M', path: specPath })),
    );

    assert.equal(result.valid, true);
    assert.deepEqual(result.summary.changedSpecs, [...changedSpecs].toSorted());
    const specJob = result.matrix.find((job) => job.run_mode === 'spec');
    assert.ok(specJob);
    assert.deepEqual(specJob.specs, [...changedSpecs].toSorted());
    assert.ok(specJob.planned_test_count > 0);
  });

  it('rejects a changed spec that still has no CI-selectable tag', () => {
    const result = planForHistory([
      {
        status: 'M',
        path: 'packages/cypress/cypress/tests/e2e/modelCatalog/testCatalogToolCalling.cy.ts',
      },
    ]);

    assert.equal(result.valid, false);
    assert.match(
      result.errors.join('\n'),
      /New or modified Cypress spec has no CI-selectable tag or non-CI owner/,
    );
  });

  it('maps the historical Model Registry package change to the affected catalog specs', () => {
    const result = planForHistory([
      {
        status: 'M',
        path: 'packages/model-registry/upstream/frontend/src/app/pages/modelCatalogSettings/utils/modelCatalogSettingsUtils.ts',
      },
    ]);

    assert.equal(result.valid, true);
    assert.ok(result.summary.pathImpactTags.includes('@ModelCatalogCI'));
    assert.ok(result.summary.pathImpactTags.includes('@ModelRegistryCI'));
    assert.ok(
      result.summary.resolvedTags['@ModelCatalogCI'].specs.includes(
        'packages/cypress/cypress/tests/e2e/modelCatalog/testPerformanceFiltersAvailable.cy.ts',
      ),
    );
    assert.ok(
      result.summary.resolvedTags['@ModelCatalogCI'].specs.includes(
        'packages/cypress/cypress/tests/e2e/modelCatalog/testCatalogDeployModel.cy.ts',
      ),
    );
  });

  it('maps the historical AutoRAG package change to its experiment workflow', () => {
    const result = planForHistory([{ status: 'M', path: 'packages/autorag/package.json' }]);

    assert.equal(result.valid, true);
    assert.ok(result.summary.pathImpactTags.includes('@AutoRAGCI'));
    assert.ok(
      result.summary.resolvedTags['@AutoRAGCI'].specs.includes(
        'packages/cypress/cypress/tests/e2e/autorag/testAutoragExperimentsAndRunManagement.cy.ts',
      ),
    );
  });

  it('replays the historical AutoRAG PR and rejects its untagged changed spec', () => {
    const result = planForHistory(pr9783Files);
    const changedSpecs = [
      'packages/cypress/cypress/tests/e2e/autorag/testAutoragExperimentsAndRunManagement.cy.ts',
      'packages/cypress/cypress/tests/e2e/autorag/testAutoragMetricVariations.cy.ts',
      'packages/cypress/cypress/tests/e2e/autorag/testAutoragOptimization.cy.ts',
    ];

    assert.equal(result.valid, false);
    assert.match(
      result.errors.join('\n'),
      /New or modified Cypress spec has no CI-selectable tag or non-CI owner: .*testAutoragMetricVariations\.cy\.ts/,
    );
    assert.deepEqual(result.summary.changedSpecs, [...changedSpecs].toSorted());
    assert.ok(result.summary.pathImpactTags.includes('@AutoRAGCI'));
    const specJob = result.matrix.find((job) => job.run_mode === 'spec');
    assert.ok(specJob);
    assert.deepEqual(
      specJob.specs,
      [
        'packages/cypress/cypress/tests/e2e/autorag/testAutoragExperimentsAndRunManagement.cy.ts',
        'packages/cypress/cypress/tests/e2e/autorag/testAutoragOptimization.cy.ts',
      ].toSorted(),
    );
  });

  it('makes a package without an executable suite use an explicit regression fallback', () => {
    const result = planForHistory([
      { status: 'M', path: 'packages/data-connect-hub/package.json' },
    ]);

    assert.equal(result.valid, true);
    assert.deepEqual(result.summary.pathImpactTags, ['@ci-dashboard-regression-tags']);
    assert.equal(
      result.summary.matchedMappings.find(
        (mapping) => mapping.path === 'packages/data-connect-hub/package.json',
      ).fallbackUsed,
      true,
    );
  });

  it('maps workflow changes to the selection contract and dashboard regression checks', () => {
    const result = planForHistory([
      { status: 'M', path: '.github/workflows/cypress-e2e-test.yml' },
    ]);

    assert.equal(result.valid, true);
    assert.equal(result.summary.matchedMappings[0].mappingId, 'ci-and-selection-config');
    assert.deepEqual(result.summary.pathImpactTags, ['@ci-dashboard-regression-tags']);
    assert.ok(result.summary.supportingChecks.includes('selection-contract-tests'));
  });

  it('uses full canonical coverage only when Cypress support code is deleted', () => {
    const result = planForHistory([
      { status: 'D', path: 'packages/cypress/cypress/pages/modelCatalog/modelCatalog.ts' },
    ]);

    assert.equal(result.valid, true);
    assert.equal(result.summary.impactMode, 'full-coverage-tags');
    assert.ok(result.matrix.length > 0);
    const tagJobs = result.matrix.filter((job) => job.run_mode === 'tag');
    const residualSpecJobs = result.matrix.filter((job) => job.run_mode === 'spec');
    assert.ok(tagJobs.length > 0);
    assert.ok(tagJobs.every((job) => job.tag_dir.startsWith('full-coverage-')));
    assert.ok(residualSpecJobs.length > 0);
    assert.ok(residualSpecJobs.every((job) => job.tag_dir.startsWith('impactedspec-')));
  });
});
