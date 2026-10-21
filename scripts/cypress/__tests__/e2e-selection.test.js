'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  buildFixtureConsumers,
  buildSelectionPlan,
  createSpecJobs,
  groupTagsForJobs,
  matchesPathPattern,
  parseSpecSource,
  parseTagSelection,
  resolveSelectedTags,
} = require('../lib/e2e-selection');

const specPath = (name) => `packages/cypress/cypress/tests/e2e/${name}.cy.ts`;
const supportPath = (name) => `packages/cypress/cypress/${name}.ts`;

const inventoryEntry = (name, tags, executableTags = tags) => ({
  path: specPath(name),
  testCount: 1,
  executableTestCount: executableTags.length > 0 ? 1 : 0,
  tags,
  executableTags,
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

describe('buildSelectionPlan', () => {
  it('always schedules changed specs in addition to selected tag jobs', () => {
    const result = plan([{ status: 'M', path: specPath('alpha') }]);

    assert.equal(result.valid, true);
    assert.deepEqual(result.summary.changedSpecs, [specPath('alpha')]);
    assert.ok(result.matrix.some((job) => job.run_mode === 'tag' && job.tag === '@Tag'));
    assert.ok(
      result.matrix.some((job) => job.run_mode === 'spec' && job.specs.includes(specPath('alpha'))),
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
