'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  buildFixtureConsumers,
  buildSpecInventory,
  buildSelectionPlan,
  createSpecJobs,
  discoverCiTags,
  discoverE2eSpecs,
  groupTagsForJobs,
  isCypressSupportFile,
  isSafeSpecPath,
  matchesPathPattern,
  normalizeTag,
  parseSpecSource,
  parseTagSelection,
  readPathImpactMap,
  renderSelectionMarkdown,
  resolveSelectedTags,
  sanitizeTagDir,
} = require('../lib/e2e-selection');
const { buildSelectionSummaryPayload } = require('../plan-e2e-selection');

const specPath = (name) => `packages/cypress/cypress/tests/e2e/${name}.cy.ts`;
const supportPath = (name) => `packages/cypress/cypress/${name}.ts`;
const repositoryRoot = path.join(__dirname, '../../..');

const inventoryEntry = (name, tags, executableTags = tags) => ({
  path: specPath(name),
  testCount: 1,
  executableTestCount: executableTags.length > 0 ? 1 : 0,
  tags,
  executableTags,
  executableTestTags: executableTags.length > 0 ? [executableTags] : [],
  intentionallyExcludedTestCount: executableTags.length === 0 && tags.length > 0 ? 1 : 0,
});

const inventory = {
  [specPath('alpha')]: inventoryEntry('alpha', ['@Tag', '@CI']),
  [specPath('bravo')]: inventoryEntry('bravo', ['@Tag']),
  [specPath('other')]: inventoryEntry('other', ['@Other']),
  [specPath('skipped')]: inventoryEntry('skipped', ['@NonConcurrent'], []),
};

const dependencyIndex = {
  consumers: {
    [supportPath('pages/shared')]: [specPath('alpha'), specPath('bravo'), specPath('skipped')],
  },
};

const plan = (changes, options = {}) =>
  buildSelectionPlan({
    changes,
    inventory,
    dependencyIndex,
    selectedTags: options.selectedTags ?? ['@Tag'],
    autoTags: options.autoTags ?? [],
    ciTags: options.ciTags ?? ['@Tag', '@CI'],
    nonCiSpecs: options.nonCiSpecs ?? {},
    ...options,
  });

const testPathImpactMap = (patterns) => ({
  schemaVersion: 1,
  mappings: patterns.map((pattern) => ({
    id: `test-${pattern}`,
    description: `Test mapping for ${pattern}`,
    pathPatterns: [pattern],
    selectionMode: 'none',
    environments: [],
    supportingChecks: [],
    coverageInventoryIds: [],
  })),
});

describe('parseTagSelection', () => {
  it('combines default, manual, label, and auto-detected tags', () => {
    const selection = parseTagSelection({
      additionalTags: '@Manual',
      prLabels: 'test:Pipelines,test:ModelServing',
      autoTags: '@AutoOne @AutoTwo',
    });

    assert.deepEqual(selection.selectedTags, [
      '@ci-dashboard-regression-tags',
      '@Manual',
      '@Pipelines',
      '@ModelServing',
      '@AutoOne',
      '@AutoTwo',
    ]);
    assert.equal(selection.source, 'default+manual+pr-labels+auto-detected');
  });

  it('respects skip flags and preserves detected tags when the default is skipped', () => {
    const selection = parseTagSelection({
      autoTags: '@Auto',
      skipDefault: true,
    });

    assert.deepEqual(selection.selectedTags, ['@Auto']);
    assert.equal(selection.source, 'auto-detected');
  });

  it('omits auto-detected tags when auto detection is disabled', () => {
    const selection = parseTagSelection({
      autoTags: '@Auto',
      skipAutoDetect: true,
    });

    assert.deepEqual(selection.selectedTags, ['@ci-dashboard-regression-tags']);
    assert.deepEqual(selection.autoTags, []);
  });
});

describe('resolveSelectedTags', () => {
  it('resolves a tag to executable specs and tests', () => {
    const result = resolveSelectedTags(['@Tag'], inventory);

    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.resolved['@Tag'].specs, [specPath('alpha'), specPath('bravo')]);
    assert.equal(result.resolved['@Tag'].testCount, 2);
  });

  it('counts only tests that match the selected tag', () => {
    const mixedInventory = {
      [specPath('mixed')]: {
        ...inventoryEntry('mixed', ['@Tag', '@Other']),
        testCount: 2,
        executableTestCount: 2,
        executableTestTags: [['@Tag'], ['@Other']],
      },
    };
    const result = resolveSelectedTags(['@Tag'], mixedInventory);

    assert.deepEqual(result.errors, []);
    assert.equal(result.resolved['@Tag'].testCount, 1);
  });

  it('fails when a selected tag has no executable tests', () => {
    const result = resolveSelectedTags(['@NonConcurrent'], inventory);

    assert.match(result.errors[0], /zero executable tests/);
  });
});

describe('matchesPathPattern', () => {
  it('supports exact paths, single-segment wildcards, character wildcards, and recursive wildcards', () => {
    assert.equal(
      matchesPathPattern('manifests/base/networkpolicy.yaml', 'manifests/base/networkpolicy.yaml'),
      true,
    );
    assert.equal(
      matchesPathPattern(
        'manifests/modules/*/networkpolicy.yaml',
        'manifests/modules/feature-store/networkpolicy.yaml',
      ),
      true,
    );
    assert.equal(
      matchesPathPattern(
        'manifests/modules/*/networkpolicy.yaml',
        'manifests/modules/feature-store/extra/networkpolicy.yaml',
      ),
      false,
    );
    assert.equal(matchesPathPattern('tsconfig?.json', 'tsconfig1.json'), true);
    assert.equal(matchesPathPattern('tsconfig?.json', 'tsconfig10.json'), false);
    assert.equal(
      matchesPathPattern('frontend/src/**', 'frontend/src/pages/pipelines/index.tsx'),
      true,
    );
    assert.equal(matchesPathPattern('frontend/src/**', 'frontend/tests/index.tsx'), false);
  });
});

describe('sanitizeTagDir', () => {
  it('excludes characters that are unsafe in artifact paths', () => {
    assert.equal(sanitizeTagDir('@Tag:Name'), 'Tag-Name');
  });

  it('bounds long tag directories with a stable hash suffix', () => {
    const sanitized = sanitizeTagDir(`@${'A'.repeat(120)}`);

    assert.equal(sanitized.length, 80);
    assert.match(sanitized, /^[A-Za-z0-9_.-]+$/);
    assert.match(sanitized, /-[0-9a-f]{8}$/);
  });
});

describe('buildSelectionPlan', () => {
  it('always schedules changed specs in addition to selected tag jobs', () => {
    const result = plan([{ status: 'M', path: specPath('alpha') }]);

    assert.equal(result.valid, true);
    assert.deepEqual(result.summary.changedSpecs, [specPath('alpha')]);
    const tagJob = result.matrix.find((job) => job.run_mode === 'tag');
    const specJob = result.matrix.find((job) => job.run_mode === 'spec');
    assert.equal(tagJob.tag, '@Tag');
    assert.equal(tagJob.planned_test_count, 2);
    assert.equal(specJob.specs.includes(specPath('alpha')), true);
    assert.equal(specJob.planned_test_count, 1);
    assert.equal(
      result.matrix.every(
        (job) => Number.isInteger(job.planned_test_count) && job.planned_test_count > 0,
      ),
      true,
    );
  });

  it('does not schedule unchanged specs as explicit jobs', () => {
    const localInventory = {
      ...inventory,
      [specPath('default')]: inventoryEntry('default', ['@ci-dashboard-regression-tags']),
    };

    const result = plan([{ status: 'M', path: 'frontend/src/App.tsx' }], {
      inventory: localInventory,
    });

    assert.equal(result.valid, true);
    assert.deepEqual(result.summary.changedSpecs, []);
    assert.equal(result.matrix.filter((job) => job.run_mode === 'spec').length, 0);
    assert.deepEqual(result.summary.pathImpactTags, ['@ci-dashboard-regression-tags']);
    assert.equal(
      result.summary.matchedMappings.some(
        (mapping) => mapping.mappingId === 'frontend-area' && mapping.fallbackUsed,
      ),
      true,
    );
  });

  it('does not treat Cypress documentation as fixture support code', () => {
    const result = plan([{ status: 'M', path: 'packages/cypress/cypress/tests/e2e/README.md' }]);

    assert.equal(result.valid, true);
    assert.deepEqual(result.summary.impactedSpecs, []);
    assert.equal(result.matrix.filter((job) => job.run_mode === 'spec').length, 0);
  });

  it('does not treat non-E2E Cypress test trees as support code', () => {
    assert.equal(
      isCypressSupportFile('packages/cypress/cypress/tests/mocked/example.cy.ts'),
      false,
    );
  });

  it('does not schedule full coverage when non-E2E Cypress test files are deleted', () => {
    const result = plan(
      [{ status: 'D', path: 'packages/cypress/cypress/tests/mocked/example.cy.ts' }],
      {
        pathImpactMap: testPathImpactMap(['packages/cypress/cypress/tests/mocked/**']),
      },
    );

    assert.equal(result.valid, true);
    assert.equal(result.summary.impactMode, 'none');
  });

  it('schedules all CI-runnable specs when support code has no consumers', () => {
    const result = plan([{ status: 'M', path: supportPath('pages/unknown') }], {
      selectedTags: ['@Other'],
      pathImpactMap: testPathImpactMap([supportPath('pages/unknown')]),
    });

    assert.equal(result.valid, true);
    assert.deepEqual(result.summary.impactedSpecs, [specPath('alpha'), specPath('bravo')]);
  });

  it('classifies only the previous path as deleted when a spec is renamed to support code', () => {
    const renamedPath = supportPath('support/renamed');
    const result = plan([{ status: 'R', path: renamedPath, previousPath: specPath('alpha') }], {
      pathImpactMap: testPathImpactMap([specPath('alpha'), renamedPath]),
      dependencyIndex: {
        consumers: {
          [renamedPath]: [specPath('bravo')],
        },
      },
      baseInventory: {
        [specPath('alpha')]: inventoryEntry('alpha', ['@Tag']),
      },
    });

    assert.equal(result.valid, true);
    assert.deepEqual(result.summary.changedSpecs, []);
    assert.deepEqual(result.summary.deletedSpecs, [specPath('alpha')]);
    assert.deepEqual(result.summary.impactedSpecs, [specPath('bravo')]);
  });

  it('computes the reverse impact set for changed Cypress support code', () => {
    const result = plan([{ status: 'M', path: supportPath('pages/shared') }], {
      selectedTags: ['@Other'],
    });

    assert.equal(result.valid, true);
    assert.deepEqual(result.summary.impactedSpecs, [specPath('alpha'), specPath('bravo')]);
    assert.equal(result.summary.impactMode, 'explicit-specs');
    const impactedJob = result.matrix.find((job) => job.tag.startsWith('@ImpactedSpec'));
    assert.deepEqual(impactedJob.specs, [specPath('alpha'), specPath('bravo')]);
  });

  it('schedules an impacted spec when selected tags cover only some of its tests', () => {
    const mixedInventory = {
      [specPath('mixed')]: {
        ...inventoryEntry('mixed', ['@Tag', '@CI']),
        testCount: 2,
        executableTestCount: 2,
        executableTestTags: [['@Tag'], ['@CI']],
      },
    };

    const result = plan([{ status: 'M', path: supportPath('pages/shared') }], {
      inventory: mixedInventory,
      dependencyIndex: {
        consumers: {
          [supportPath('pages/shared')]: [specPath('mixed')],
        },
      },
      selectedTags: ['@Tag'],
    });

    assert.equal(result.valid, true);
    assert.equal(result.summary.impactMode, 'explicit-specs');
    const impactedJob = result.matrix.find((job) => job.tag.startsWith('@ImpactedSpec'));
    assert.deepEqual(impactedJob.specs, [specPath('mixed')]);
    assert.equal(impactedJob.planned_test_count, 2);
  });

  it('does not schedule impacted specs with no executable tests', () => {
    const result = plan([{ status: 'M', path: supportPath('pages/shared') }]);

    assert.equal(result.valid, true);
    assert.ok(!result.summary.impactedSpecs.includes(specPath('skipped')));
    assert.ok(
      result.matrix
        .filter((job) => job.run_mode === 'spec')
        .every((job) => !job.specs.includes(specPath('skipped'))),
    );
  });

  it('does not schedule impacted specs without CI-selectable tags', () => {
    const localInventory = {
      [specPath('alpha')]: inventory[specPath('alpha')],
      [specPath('other')]: inventory[specPath('other')],
      [specPath('feature-flagged')]: inventoryEntry('feature-flagged', ['@FeatureFlagged']),
    };

    const result = plan([{ status: 'M', path: supportPath('pages/shared') }], {
      inventory: localInventory,
      dependencyIndex: {
        consumers: {
          [supportPath('pages/shared')]: [specPath('alpha'), specPath('feature-flagged')],
        },
      },
      selectedTags: ['@Other'],
    });

    assert.equal(result.valid, true);
    assert.deepEqual(result.summary.impactedSpecs, [specPath('alpha')]);
    const impactedJob = result.matrix.find((job) => job.tag.startsWith('@ImpactedSpec'));
    assert.deepEqual(impactedJob.specs, [specPath('alpha')]);
  });

  it('maps broad reverse impact to package CI tags instead of every spec', () => {
    const broadInventory = {};
    const broadSpecs = Array.from({ length: 6 }, (_, index) => `broad-${index}`);
    broadInventory[specPath('selector')] = inventoryEntry('selector', ['@Tag']);
    broadInventory[specPath('wide')] = inventoryEntry('wide', ['@WideCI']);
    for (const name of broadSpecs) {
      broadInventory[specPath(name)] = inventoryEntry(name, ['@BroadCI', '@WideCI']);
    }

    const result = plan([{ status: 'M', path: supportPath('pages/shared') }], {
      inventory: broadInventory,
      dependencyIndex: {
        consumers: {
          [supportPath('pages/shared')]: broadSpecs.map((name) => specPath(name)),
        },
      },
      ciTags: ['@Tag', '@BroadCI', '@WideCI'],
    });

    assert.equal(result.valid, true);
    assert.equal(result.summary.impactMode, 'ci-tags');
    assert.equal(result.matrix.filter((job) => job.run_mode === 'spec').length, 0);
    const impactedTagJob = result.matrix.find((job) => job.tag_dir === 'impacted-tag-01');
    assert.equal(impactedTagJob.tag, '@BroadCI');
  });

  it('selects enough impact tags to cover every executable test in broad reverse impact', () => {
    const broadInventory = {};
    const broadSpecs = Array.from({ length: 6 }, (_, index) => `mixed-broad-${index}`);
    for (const name of broadSpecs) {
      broadInventory[specPath(name)] = {
        ...inventoryEntry(name, ['@BroadCI', '@NarrowCI']),
        testCount: 2,
        executableTestCount: 2,
        executableTestTags: [['@BroadCI'], ['@NarrowCI']],
      };
    }

    const result = plan([{ status: 'M', path: supportPath('pages/shared') }], {
      inventory: broadInventory,
      dependencyIndex: {
        consumers: {
          [supportPath('pages/shared')]: broadSpecs.map((name) => specPath(name)),
        },
      },
      selectedTags: [],
      ciTags: ['@BroadCI', '@NarrowCI'],
    });

    assert.equal(result.valid, true);
    assert.equal(result.summary.impactMode, 'ci-tags');
    assert.equal(result.matrix.filter((job) => job.run_mode === 'spec').length, 0);
    const impactedTagJob = result.matrix.find((job) => job.tag_dir === 'impacted-tag-01');
    assert.equal(impactedTagJob.tag, '@BroadCI @NarrowCI');
    assert.equal(impactedTagJob.planned_test_count, 12);
  });

  it('maps dashboard network policy changes to their proven impact areas', () => {
    const localInventory = {
      ...inventory,
      [specPath('pipelines')]: inventoryEntry('pipelines', ['@Pipelines']),
      [specPath('workbenches')]: inventoryEntry('workbenches', ['@Workbenches']),
      [specPath('featureStore')]: inventoryEntry('featureStore', ['@FeatureStoreCI']),
    };

    const result = plan(
      [
        { status: 'M', path: 'manifests/base/networkpolicy.yaml' },
        { status: 'M', path: 'manifests/rhoai/networkpolicy.yaml' },
      ],
      {
        inventory: localInventory,
        ciTags: ['@Tag', '@CI', '@FeatureStoreCI'],
      },
    );

    assert.equal(result.valid, true);
    assert.deepEqual(result.summary.pathImpactTags, [
      '@FeatureStoreCI',
      '@Pipelines',
      '@Workbenches',
    ]);
    assert.ok(
      result.matrix.some(
        (job) => job.run_mode === 'tag' && job.tag === '@FeatureStoreCI @Pipelines @Workbenches',
      ),
    );
    assert.ok(
      result.summary.details.some((detail) => detail.includes('Path-impact mappings require')),
    );
  });

  it('maps manifest-only changes to the explicit deployment mapping', () => {
    const localInventory = {
      [specPath('default')]: inventoryEntry('default', ['@ci-dashboard-regression-tags']),
    };

    const result = plan([{ status: 'M', path: 'manifests/base/service.yaml' }], {
      inventory: localInventory,
      selectedTags: [],
    });

    assert.equal(result.valid, true);
    assert.deepEqual(result.summary.matchedMappings, [
      {
        path: 'manifests/base/service.yaml',
        mappingId: 'deployment-manifests',
        selectionMode: 'tag',
        cypressTags: ['@ci-dashboard-regression-tags'],
        derivedTags: [],
        fallbackUsed: false,
        environments: ['odh', 'rhoai', 'connected', 'operator', 'image-contract'],
        supportingChecks: ['manifest-validation'],
        coverageInventoryIds: ['deployment-manifests'],
      },
    ]);
    assert.deepEqual(result.summary.selectedEnvironments, [
      'connected',
      'image-contract',
      'odh',
      'operator',
      'rhoai',
    ]);
  });

  it('maps operator-only changes to dashboard regression and operator checks', () => {
    const localInventory = {
      [specPath('default')]: inventoryEntry('default', ['@ci-dashboard-regression-tags']),
    };

    const result = plan(
      [{ status: 'M', path: 'dashboard-operator/internal/controller/actions.go' }],
      { inventory: localInventory, selectedTags: [] },
    );

    assert.equal(result.valid, true);
    assert.equal(result.summary.matchedMappings[0].mappingId, 'dashboard-operator');
    assert.deepEqual(result.summary.supportingChecks, [
      'dashboard-operator-tests',
      'manifest-validation',
    ]);
  });

  it('maps root-file changes without relying on Turbo', () => {
    const localInventory = {
      [specPath('default')]: inventoryEntry('default', ['@ci-dashboard-regression-tags']),
    };

    const result = plan([{ status: 'M', path: 'package.json' }], {
      inventory: localInventory,
      selectedTags: [],
    });

    assert.equal(result.valid, true);
    assert.equal(result.summary.matchedMappings[0].mappingId, 'build-and-environment-config');
    assert.deepEqual(result.summary.pathImpactTags, ['@ci-dashboard-regression-tags']);
  });

  it('derives module network-policy tags from the owning workspace package', () => {
    const localInventory = {
      [specPath('featureStore')]: inventoryEntry('featureStore', ['@FeatureStoreCI']),
    };

    const result = plan(
      [{ status: 'M', path: 'manifests/modules/feature-store/networkpolicy.yaml' }],
      {
        inventory: localInventory,
        selectedTags: [],
        workspacePackages: [{ path: 'packages/feature-store', e2eCiTags: ['@FeatureStoreCI'] }],
      },
    );

    assert.equal(result.valid, true);
    assert.deepEqual(result.summary.derivedPathImpactTags, ['@FeatureStoreCI']);
    assert.deepEqual(result.summary.pathImpactTags, ['@FeatureStoreCI']);
  });

  it('derives workspace tags through transitive reverse dependencies', () => {
    const localInventory = {
      [specPath('automl')]: inventoryEntry('automl', ['@AutoMLCI']),
      [specPath('autorag')]: inventoryEntry('autorag', ['@AutoRAGCI']),
    };
    const workspacePackages = [
      {
        name: '@odh-dashboard/autox-core',
        path: 'packages/autox-core',
      },
      {
        name: '@odh-dashboard/shared-feature',
        path: 'packages/shared-feature',
        dependencies: { '@odh-dashboard/autox-core': 'workspace:*' },
      },
      {
        name: '@odh-dashboard/automl',
        path: 'packages/automl',
        e2eCiTags: ['@AutoMLCI'],
        dependencies: { '@odh-dashboard/autox-core': 'workspace:*' },
      },
      {
        name: '@odh-dashboard/autorag',
        path: 'packages/autorag',
        e2eCiTags: ['@AutoRAGCI'],
        dependencies: { '@odh-dashboard/shared-feature': 'workspace:*' },
      },
    ];

    const result = plan(
      [{ status: 'M', path: 'packages/autox-core/services/pipelines/client.go' }],
      {
        inventory: localInventory,
        selectedTags: [],
        ciTags: ['@AutoMLCI', '@AutoRAGCI'],
        workspacePackages,
      },
    );

    assert.equal(result.valid, true);
    assert.ok(result.summary.pathImpactTags.includes('@AutoMLCI'));
    assert.ok(result.summary.pathImpactTags.includes('@AutoRAGCI'));
    assert.equal(result.summary.matchedMappings[0].fallbackUsed, false);
  });

  it('derives workspace tags through reverse dev and optional dependencies', () => {
    const localInventory = {
      [specPath('automl')]: inventoryEntry('automl', ['@AutoMLCI']),
      [specPath('autorag')]: inventoryEntry('autorag', ['@AutoRAGCI']),
    };
    const workspacePackages = [
      {
        name: '@odh-dashboard/app-config',
        path: 'packages/app-config',
      },
      {
        name: '@odh-dashboard/automl',
        path: 'packages/automl',
        e2eCiTags: ['@AutoMLCI'],
        devDependencies: { '@odh-dashboard/app-config': 'workspace:*' },
      },
      {
        name: '@odh-dashboard/autorag',
        path: 'packages/autorag',
        e2eCiTags: ['@AutoRAGCI'],
        optionalDependencies: { '@odh-dashboard/app-config': 'workspace:*' },
      },
    ];

    const result = plan([{ status: 'M', path: 'packages/app-config/src/config.ts' }], {
      inventory: localInventory,
      selectedTags: [],
      ciTags: ['@AutoMLCI', '@AutoRAGCI'],
      workspacePackages,
    });

    assert.equal(result.valid, true);
    assert.ok(result.summary.pathImpactTags.includes('@AutoMLCI'));
    assert.ok(result.summary.pathImpactTags.includes('@AutoRAGCI'));
  });

  it('maps packages without executable suite tags to dashboard regression', () => {
    const localInventory = {
      [specPath('default')]: inventoryEntry('default', ['@ci-dashboard-regression-tags']),
    };

    const result = plan([{ status: 'M', path: 'packages/mlflow/src/example.ts' }], {
      inventory: localInventory,
      selectedTags: [],
    });

    assert.equal(result.valid, true);
    assert.equal(
      result.summary.matchedMappings[0].mappingId,
      'package-without-executable-e2e-suite',
    );
    assert.deepEqual(result.summary.pathImpactTags, ['@ci-dashboard-regression-tags']);
    assert.ok(!result.summary.selectedTags.includes('@MLflowCI'));
  });

  it('derives frontend area tags from the machine-readable area map', () => {
    const localInventory = {
      [specPath('pipelines')]: inventoryEntry('pipelines', ['@PipelinesCI']),
    };

    const result = plan([{ status: 'M', path: 'frontend/src/pages/pipelines/Pipelines.tsx' }], {
      inventory: localInventory,
      selectedTags: [],
      frontendAreaTags: { pipelines: '@PipelinesCI' },
    });

    assert.equal(result.valid, true);
    assert.deepEqual(result.summary.derivedPathImpactTags, ['@PipelinesCI']);
    assert.equal(result.summary.matchedMappings[0].fallbackUsed, false);
  });

  it('fails when an impactful path has no explicit mapping', () => {
    const pathImpactMap = {
      schemaVersion: 1,
      mappings: [
        {
          id: 'known',
          description: 'Known path',
          pathPatterns: ['known.txt'],
          selectionMode: 'tag',
          cypressTags: ['@Tag'],
          environments: ['odh'],
          supportingChecks: [],
          coverageInventoryIds: [],
        },
      ],
    };

    const result = plan([{ status: 'M', path: 'unknown.txt' }], { pathImpactMap });

    assert.equal(result.valid, false);
    assert.deepEqual(result.summary.unmatchedImpactfulPaths, ['unknown.txt']);
    assert.match(result.errors.join('\n'), /has no E2E path-impact mapping/);
  });

  it('fails an all-skipped path-impact selection', () => {
    const pathImpactMap = {
      schemaVersion: 1,
      mappings: [
        {
          id: 'skipped-behavior',
          description: 'Skipped behavior',
          pathPatterns: ['skipped.txt'],
          selectionMode: 'tag',
          cypressTags: ['@NonConcurrent'],
          environments: ['odh'],
          supportingChecks: [],
          coverageInventoryIds: [],
        },
      ],
    };

    const result = plan([{ status: 'M', path: 'skipped.txt' }], {
      pathImpactMap,
      selectedTags: [],
      coverageInventory: { schemaVersion: 1, behaviors: [] },
      environmentCapabilities: {
        schemaVersion: 1,
        defaultCapabilities: { odh: true },
        tags: ['@NonConcurrent'],
        tagOverrides: {},
        notSupportedReasons: {},
      },
    });

    assert.equal(result.valid, false);
    assert.match(result.errors.join('\n'), /@NonConcurrent resolves to zero executable tests/);
  });

  it('rejects invalid environment tag overrides', () => {
    const environmentCapabilities = {
      schemaVersion: 1,
      defaultCapabilities: { odh: true },
      tags: ['@Tag'],
      notSupportedReasons: {},
    };

    assert.throws(
      () =>
        plan([{ status: 'M', path: 'package.json' }], {
          environmentCapabilities: {
            ...environmentCapabilities,
            tagOverrides: { '@Unknown': { odh: true } },
          },
        }),
      /references an unknown tag/,
    );
    assert.throws(
      () =>
        plan([{ status: 'M', path: 'package.json' }], {
          environmentCapabilities: {
            ...environmentCapabilities,
            tagOverrides: { '@Tag': { odh: 'yes' } },
          },
        }),
      /capability odh must be boolean/,
    );
  });

  it('declares every executable path-impact tag in the environment capability matrix', () => {
    const pathImpactMap = readPathImpactMap(repositoryRoot);
    const environmentCapabilities = JSON.parse(
      fs.readFileSync(
        path.join(repositoryRoot, 'scripts/cypress/e2e-environment-capabilities.json'),
        'utf8',
      ),
    );
    const frontendAreaTags = JSON.parse(
      fs.readFileSync(path.join(repositoryRoot, '.github/frontend-ci-tags.json'), 'utf8'),
    );
    const repositoryInventory = buildSpecInventory({
      specs: discoverE2eSpecs(repositoryRoot),
      root: repositoryRoot,
    });
    const executableInventoryTags = new Set(
      Object.values(repositoryInventory).flatMap((entry) => entry.executableTags ?? []),
    );
    const expectedTags = [
      ...new Set(
        [
          ...pathImpactMap.mappings.flatMap((mapping) => [
            ...(mapping.cypressTags ?? []),
            ...(mapping.fallbackCypressTags ?? []),
          ]),
          ...Object.values(frontendAreaTags),
          ...discoverCiTags(repositoryRoot),
        ].map(normalizeTag),
      ),
    ].filter((tag) => executableInventoryTags.has(tag));
    const missingTags = expectedTags.filter((tag) => !environmentCapabilities.tags.includes(tag));

    assert.deepEqual(missingTags, []);
  });

  it('uses canonical full-coverage tag sets when support code is deleted', () => {
    const fullInventory = {
      [specPath('alpha')]: inventoryEntry('alpha', ['@Tag', '@SmokeSet1']),
      [specPath('bravo')]: inventoryEntry('bravo', ['@Tag', '@SmokeSet2']),
    };

    const result = plan([{ status: 'D', path: supportPath('pages/shared') }], {
      inventory: fullInventory,
    });

    assert.equal(result.valid, true);
    assert.equal(result.summary.impactMode, 'full-coverage-tags');
    assert.equal(result.matrix.filter((job) => job.run_mode === 'spec').length, 0);
    const fullCoverageJob = result.matrix.find((job) => job.tag_dir === 'full-coverage-01');
    assert.equal(fullCoverageJob.tag, '@SmokeSet1 @SmokeSet2');
  });

  it('schedules residual specs when canonical full-coverage tags omit CI tests', () => {
    const fullInventory = {
      [specPath('alpha')]: inventoryEntry('alpha', ['@Tag', '@SmokeSet1']),
      [specPath('bravo')]: inventoryEntry('bravo', ['@Tag', '@SmokeSet2']),
      [specPath('residual')]: inventoryEntry('residual', ['@Tag']),
    };

    const result = plan([{ status: 'D', path: supportPath('pages/shared') }], {
      inventory: fullInventory,
      selectedTags: [],
    });

    assert.equal(result.valid, true);
    assert.equal(result.summary.impactMode, 'full-coverage-tags');
    assert.deepEqual(result.summary.impactedSpecs, [specPath('residual')]);
    const residualJob = result.matrix.find((job) => job.run_mode === 'spec');
    assert.deepEqual(residualJob.specs, [specPath('residual')]);
    assert.equal(
      result.matrix.find((job) => job.tag_dir === 'full-coverage-01').tag,
      '@SmokeSet1 @SmokeSet2',
    );
  });

  it('schedules residual impacted specs when broad impact uses full coverage', () => {
    const impactedSpecs = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot'];
    const fullInventory = Object.fromEntries(
      impactedSpecs.map((name) => {
        const canonicalTag = name === 'alpha' || name === 'delta' ? '@SmokeSet1' : '@SmokeSet2';
        const tags = ['charlie', 'foxtrot'].includes(name) ? ['@Tag'] : ['@Tag', canonicalTag];
        return [specPath(name), inventoryEntry(name, tags)];
      }),
    );
    const localDependencyIndex = {
      consumers: {
        [supportPath('pages/shared')]: impactedSpecs.map((name) => specPath(name)),
      },
    };

    const result = plan([{ status: 'M', path: supportPath('pages/shared') }], {
      inventory: fullInventory,
      dependencyIndex: localDependencyIndex,
      selectedTags: [],
    });

    assert.equal(result.valid, true);
    assert.equal(result.summary.impactMode, 'full-coverage-tags');
    assert.deepEqual(
      result.summary.impactedSpecs,
      impactedSpecs.map((name) => specPath(name)),
    );
    const residualJob = result.matrix.find((job) => job.run_mode === 'spec');
    assert.deepEqual(residualJob.specs, [specPath('charlie'), specPath('foxtrot')]);
    assert.equal(
      result.matrix.find((job) => job.tag_dir === 'full-coverage-01').tag,
      '@SmokeSet1 @SmokeSet2',
    );
  });

  it('retains package-tag coverage when broad impact falls back to canonical tags', () => {
    const packageSpecs = ['alpha', 'bravo'];
    const canonicalSpecs = ['charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel'];
    const impactedSpecs = [...packageSpecs, ...canonicalSpecs];
    const fullInventory = Object.fromEntries(
      impactedSpecs.map((name) => {
        const tags = packageSpecs.includes(name) ? ['@Tag', '@PackageCI'] : ['@Tag', '@SmokeSet1'];
        return [specPath(name), inventoryEntry(name, tags)];
      }),
    );
    const localDependencyIndex = {
      consumers: {
        [supportPath('pages/shared')]: impactedSpecs.map((name) => specPath(name)),
      },
    };

    const result = plan([{ status: 'M', path: supportPath('pages/shared') }], {
      inventory: fullInventory,
      dependencyIndex: localDependencyIndex,
      selectedTags: [],
      ciTags: ['@Tag', '@PackageCI'],
    });

    assert.equal(result.valid, true);
    assert.equal(result.summary.impactMode, 'full-coverage-tags');
    assert.deepEqual(
      result.summary.impactedSpecs,
      impactedSpecs.map((name) => specPath(name)),
    );
    const residualJob = result.matrix.find((job) => job.run_mode === 'spec');
    assert.deepEqual(
      residualJob.specs,
      packageSpecs.map((name) => specPath(name)),
    );
    assert.equal(result.matrix.find((job) => job.tag_dir === 'full-coverage-01').tag, '@SmokeSet1');
  });

  it('fails selection when a selected tag resolves to zero tests', () => {
    const result = plan([], { selectedTags: ['@Missing'] });

    assert.equal(result.valid, false);
    assert.match(result.errors.join('\n'), /@Missing resolves to zero executable tests/);
  });

  it('requires a CI-selectable tag or a recorded non-CI owner for changed specs', () => {
    const result = plan([{ status: 'A', path: specPath('other') }], {
      ciTags: ['@Tag'],
    });

    assert.equal(result.valid, false);
    assert.match(result.errors.join('\n'), /no CI-selectable tag or non-CI owner/);

    const allowed = plan([{ status: 'A', path: specPath('other') }], {
      ciTags: ['@Tag'],
      nonCiSpecs: {
        [specPath('other')]: { owner: 'dashboard', reason: 'manual-only diagnostic' },
      },
    });
    assert.equal(allowed.valid, true);
    assert.deepEqual(allowed.summary.changedSpecs, [specPath('other')]);
    assert.ok(
      allowed.matrix.every(
        (job) => job.run_mode !== 'spec' || !job.specs.includes(specPath('other')),
      ),
    );
  });

  it('allows an owned changed spec whose tests are intentionally skip-tag excluded', () => {
    const unowned = plan([{ status: 'M', path: specPath('skipped') }]);

    assert.equal(unowned.valid, false);
    assert.match(unowned.errors.join('\n'), /has no executable tests/);

    const owned = plan([{ status: 'M', path: specPath('skipped') }], {
      nonCiSpecs: {
        [specPath('skipped')]: { owner: 'dashboard', reason: 'manual-only diagnostic' },
      },
    });

    assert.equal(owned.valid, true);
    assert.deepEqual(owned.summary.changedSpecs, [specPath('skipped')]);
    assert.ok(
      owned.matrix.every(
        (job) => job.run_mode !== 'spec' || !job.specs.includes(specPath('skipped')),
      ),
    );
  });

  it('rejects deleting the only coverage for a mapped CI behavior', () => {
    const deletedSpec = specPath('alpha');
    const result = plan([{ status: 'D', path: deletedSpec }], {
      inventory: {
        [specPath('other')]: inventory[specPath('other')],
      },
      baseInventory: {
        [deletedSpec]: inventoryEntry('alpha', ['@Tag']),
      },
    });

    assert.equal(result.valid, false);
    assert.match(result.errors.join('\n'), /removes the only coverage for @Tag/);
  });

  it('allows deletion when another executable spec retains the mapped behavior', () => {
    const deletedSpec = specPath('alpha');
    const result = plan([{ status: 'D', path: deletedSpec }], {
      inventory: {
        [specPath('bravo')]: inventory[specPath('bravo')],
      },
      baseInventory: {
        [deletedSpec]: inventoryEntry('alpha', ['@Tag']),
      },
    });

    assert.equal(result.valid, true);
    assert.deepEqual(result.summary.deletedSpecs, [deletedSpec]);
  });
});

describe('parseSpecSource', () => {
  it('keeps a static planned count for runtime-skippable specs', () => {
    const source = [
      'beforeEach(function () {',
      '  this.skip();',
      '});',
      "it('runs', { tags: ['@Tag'] }, () => {});",
    ].join('\n');
    const runtimeInventory = buildSpecInventory({
      specs: [specPath('runtime')],
      readFile: () => source,
      root: '.',
    });

    const result = plan([], {
      inventory: runtimeInventory,
      selectedTags: ['@Tag'],
    });

    assert.equal(result.valid, true);
    assert.equal(result.matrix[0].planned_test_count, 1);
    assert.equal(result.summary.plannedTestCount, 1);
  });

  it('does not count statically skipped tests as executable', () => {
    const tests = parseSpecSource(
      [
        "it('runs', { tags: ['@CI'] }, () => {});",
        "it.skip('is skipped', { tags: ['@CI'] }, () => {});",
        "it.todo('is incomplete');",
      ].join('\n'),
    );

    assert.equal(tests.length, 1);
    assert.deepEqual(tests, [{ tags: ['@CI'] }]);
  });

  it('resolves same-file tag constants, references, and spreads', () => {
    const tests = parseSpecSource(
      [
        "const BASE_TAGS = ['@CI'];",
        "const EXTRA_TAG = '@Smoke';",
        "it('runs', { tags: [...BASE_TAGS, EXTRA_TAG] }, () => {});",
      ].join('\n'),
    );

    assert.deepEqual(tests, [{ tags: ['@CI', '@Smoke'] }]);
  });

  it('marks tests with unresolvable tag expressions as non-executable', () => {
    const tests = parseSpecSource(
      ['const getTags = () => ["@CI"];', "it('runs', { tags: getTags() }, () => {});"].join('\n'),
    );

    assert.deepEqual(tests, [{ tags: null }]);
  });

  it('excludes tests inside locally aliased skipped suites', () => {
    const tests = parseSpecSource(
      [
        'const describeSkipped = describe.skip;',
        "describeSkipped('skipped suite', () => {",
        "  it('does not run', { tags: ['@CI'] }, () => {});",
        '});',
        "it('runs', { tags: ['@CI'] }, () => {});",
      ].join('\n'),
    );

    assert.deepEqual(tests, [{ tags: ['@CI'] }]);
  });

  it('inherits tags from describe and context options', () => {
    const tests = parseSpecSource(
      [
        "describe('suite', { tags: ['@Suite'] }, () => {",
        "  it('runs', { tags: ['@CI'] }, () => {});",
        "  context('nested', { tags: ['@Nested'] }, () => {",
        "    it('inherits suite tags', () => {});",
        '  });',
        '});',
      ].join('\n'),
    );

    assert.deepEqual(tests, [{ tags: ['@Suite', '@CI'] }, { tags: ['@Suite', '@Nested'] }]);
  });
});

describe('spec path safety', () => {
  it('accepts safe Cypress spec paths and rejects hostile paths', () => {
    assert.equal(isSafeSpecPath(specPath('dashboard/example')), true);
    assert.equal(isSafeSpecPath("packages/cypress/cypress/tests/e2e/evil'; rm -rf#.cy.ts"), false);
  });

  it('rejects hostile explicit spec paths during planning', () => {
    const unsafePath = "packages/cypress/cypress/tests/e2e/evil'; rm -rf#.cy.ts";
    const result = plan([{ status: 'A', path: unsafePath }], {
      inventory: {
        [unsafePath]: inventoryEntry("evil'; rm -rf#", ['@Tag']),
      },
      pathImpactMap: testPathImpactMap([unsafePath]),
    });

    assert.equal(result.valid, false);
    assert.match(result.errors.join('\n'), /unsupported characters/);
  });
});

describe('matrix grouping', () => {
  it('splits large auto-detected tag groups across two jobs', () => {
    const tags = Array.from({ length: 10 }, (_, index) => `@Auto${index}`);
    const groups = groupTagsForJobs(tags, tags);

    assert.equal(groups.length, 2);
    assert.equal(groups[0].length, 5);
    assert.equal(groups[1].length, 5);
  });

  it('caps explicit spec jobs while retaining every spec', () => {
    const specs = Array.from({ length: 125 }, (_, index) => `spec-${index}.cy.ts`);
    const jobs = createSpecJobs(specs, 'ChangedSpec');

    assert.equal(jobs.length, 12);
    assert.deepEqual(jobs.flatMap((job) => job.specs).toSorted(), specs.toSorted());
  });
});

describe('buildFixtureConsumers', () => {
  it('maps fixture references in specs and support code to impacted specs', (test) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-selection-'));
    test.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const files = {
      [specPath('alpha')]: "cy.fixture('e2e/example.yaml');\n",
      [supportPath('pages/loader')]: "cy.fixture('e2e/example.yaml');\n",
    };
    for (const [relativePath, contents] of Object.entries(files)) {
      const absolutePath = path.join(root, relativePath);
      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      fs.writeFileSync(absolutePath, contents);
    }

    const consumers = buildFixtureConsumers({
      root,
      specs: [specPath('alpha')],
      dependencyIndex: {
        consumers: {
          [supportPath('pages/loader')]: [specPath('bravo')],
        },
      },
      fixturePath: 'packages/cypress/cypress/fixtures/e2e/example.yaml',
    });

    assert.deepEqual(consumers, [specPath('alpha'), specPath('bravo')]);
  });
});

describe('selection summaries', () => {
  it('includes validation errors in diagnostic JSON and Markdown output', () => {
    const invalidPlan = plan([{ status: 'A', path: specPath('other') }], {
      selectedTags: [],
      ciTags: ['@Tag'],
    });
    const summaryPayload = buildSelectionSummaryPayload(invalidPlan);

    assert.equal(summaryPayload.valid, false);
    assert.ok(summaryPayload.errors.length > 0);
    assert.match(renderSelectionMarkdown(summaryPayload), /## Validation errors/);
    assert.match(renderSelectionMarkdown(summaryPayload), /no CI-selectable tag/);
  });
});
