/** @jest-environment node */
const {
  auditRuntime,
  auditProductionBuilds,
  renderReport,
  MODEL_SERVING_REMOTE_ENTRY,
} = require('../runtime-audit');

const root = '/repo';
const context = '/repo/distributions/rhaii';
const source = (resource, chunks, reasons = []) => ({
  identifier: `${root}/${resource}`,
  nameForCondition: `${root}/${resource}`,
  name: resource,
  moduleType: 'javascript/auto',
  chunks,
  reasons,
});
const entry = () =>
  source('distributions/rhaii/src/index.tsx', [1], [{ type: 'entry', active: true }]);
const importedBy = (resource) => [{ moduleIdentifier: `${root}/${resource}`, active: true }];
const stats = (modules = [entry()]) => ({
  hash: 'build-hash',
  rspackVersion: 'test',
  errors: [],
  modules,
  chunks: [
    { id: 1, initial: true, files: ['app.js'] },
    { id: 2, initial: false, files: ['lazy.js'], parents: [1] },
  ],
});
const audit = (input) => auditRuntime(input, { repoRoot: root, context });

describe('shipped production builds', () => {
  const remote = (modules = []) => ({
    ...stats([
      source('packages/model-serving/frontend/src/index.ts', [1], [{ type: 'entry' }]),
      ...modules,
    ]),
    assets: [{ name: 'remoteEntry.js' }],
  });
  const external = (entryUrl) => ({
    identifier: `external script "modelServing@${entryUrl}"`,
    moduleType: 'javascript/dynamic',
    chunks: [2],
    reasons: importedBy('distributions/rhaii/src/index.tsx'),
  });
  const auditBuilds = (hostStats, remoteStats) =>
    auditProductionBuilds(hostStats, remoteStats, { repoRoot: root, context });

  it('should audit the local remote while verifying only its exact host binding', () => {
    const report = auditBuilds(
      stats([entry(), external(MODEL_SERVING_REMOTE_ENTRY)]),
      remote([source('frontend/src/remote-legacy.ts', [2])]),
    );
    expect(report.boundaryPassed).toBe(false);
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0]).toMatchObject({
      name: 'frontend/src/remote-legacy.ts',
      chunks: ['main.1:2'],
    });
    expect(report.builds.map((build) => [build.name, build.summary.violations])).toEqual([
      ['host', 0],
      ['model-serving', 1],
    ]);
    expect(renderReport(report)).toContain('Audited same-origin Model Serving remote:');
  });

  it('should retain separate module instances and chunks when both bundles contain the same source', () => {
    const report = auditBuilds(
      stats([entry(), source('frontend/src/legacy.ts', [2])]),
      remote([source('frontend/src/legacy.ts', [2])]),
    );
    expect(report.violations).toHaveLength(2);
    expect(report.violations.map((module) => module.chunks)).toEqual([['main.0:2'], ['main.1:2']]);
  });

  it('should fail unknown host externals and references to the remote from its own bundle', () => {
    const report = auditBuilds(
      stats([entry(), external('https://example.test/remoteEntry.js')]),
      remote([external(MODEL_SERVING_REMOTE_ENTRY)]),
    );
    expect(report.violations).toHaveLength(2);
    expect(
      report.violations.every((module) => module.reason === 'unverified-external-runtime'),
    ).toBe(true);
  });

  it.each([
    undefined,
    { ...remote(), assets: [] },
    { ...remote(), errors: [{ message: 'Remote compilation failed' }] },
    { ...remote(), modules: [] },
    { ...remote(), filteredModules: 1 },
  ])('should reject missing, failed, empty, or truncated remote evidence', (remoteStats) => {
    expect(() => auditBuilds(stats(), remoteStats)).toThrow();
  });
});

describe('production runtime audit', () => {
  it('should report forbidden initial and lazy modules with transitive importer paths', () => {
    const hub = 'packages/model-serving/src/index.ts';
    const input = stats([
      entry(),
      source(hub, [1], importedBy('distributions/rhaii/src/index.tsx')),
      source('frontend/src/legacy.ts', [2], importedBy(hub)),
      source('packages/kserve/src/runtime.ts', [1], importedBy(hub)),
      source('packages/kserve-other/src/allowed.ts', [2]),
    ]);
    const report = audit(input);
    expect(report.boundaryPassed).toBe(false);
    expect(report.violations).toHaveLength(2);
    expect(
      report.violations.find((module) => module.owner === '@odh-dashboard/internal'),
    ).toMatchObject({
      initial: false,
      importerPath: ['distributions/rhaii/src/index.tsx', hub, 'frontend/src/legacy.ts'],
    });
    expect(report.violations.find((module) => module.owner === 'packages/kserve').initial).toBe(
      true,
    );
    expect(report.boundaryEdges).toContainEqual({
      importer: hub,
      module: 'frontend/src/legacy.ts',
      owner: '@odh-dashboard/internal',
    });
  });

  it('should count concatenated source modules using their parent chunk and avoid counting orphan copies twice', () => {
    const leaf = source('frontend/src/hidden.ts', []);
    const container = {
      ...source(
        'packages/llmd-serving/src/wrapper.ts',
        [2],
        importedBy('distributions/rhaii/src/index.tsx'),
      ),
      identifier: 'concatenated-wrapper',
      name: 'wrapper.ts + 1 modules',
      modules: [source('packages/llmd-serving/src/wrapper.ts', []), leaf],
    };
    const report = audit(stats([entry(), leaf, container]));
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0].chunks).toEqual(['main:2']);
    expect(report.violations[0].importerPath).toEqual([
      'distributions/rhaii/src/index.tsx',
      'packages/llmd-serving/src/wrapper.ts',
      'frontend/src/hidden.ts',
    ]);
    expect(report.summary.runtimeModules).toBe(3);
  });

  it('should exclude build-only and unchunked modules from violations', () => {
    const report = audit(
      stats([
        entry(),
        source('frontend/src/typeOnly.ts', []),
        source('packages/kserve/src/unused.ts', []),
        source('frontend/build-loader.js', []),
      ]),
    );
    expect(report.boundaryPassed).toBe(true);
    expect(report.summary.excludedModules).toBe(3);
    expect(report.runtimeModules).toHaveLength(1);
  });

  it('should preserve boundary edges recorded only on forbidden concatenation containers', () => {
    const legacy = 'frontend/src/root.ts';
    const container = {
      ...source(legacy, [2], importedBy('distributions/rhaii/src/index.tsx')),
      identifier: 'concatenated-legacy',
      modules: [source(legacy, []), source('frontend/src/nested.ts', [])],
    };
    const report = audit(stats([entry(), container]));
    expect(report.violations).toHaveLength(2);
    expect(report.boundaryEdges).toEqual([
      {
        importer: 'distributions/rhaii/src/index.tsx',
        module: legacy,
        owner: '@odh-dashboard/internal',
      },
    ]);
    expect(report.violations.find((module) => module.name === legacy).importerPath).toEqual([
      'distributions/rhaii/src/index.tsx',
      legacy,
    ]);
  });

  it('should detect forbidden workspace modules resolved through node_modules', () => {
    const report = audit(
      stats([entry(), source('node_modules/@odh-dashboard/internal/src/legacy.ts', [2])]),
    );
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0].owner).toBe('@odh-dashboard/internal');
  });

  it('should classify symlinked modules by their innermost package and allow nested shared dependencies', () => {
    const legacy =
      'packages/model-serving/frontend/node_modules/@odh-dashboard/internal/api/index.ts';
    const allowed =
      'node_modules/@odh-dashboard/internal/node_modules/@odh-dashboard/ui-core/node_modules/@patternfly/react-icons/icon.js';
    const report = audit(
      stats([
        entry(),
        source(legacy, [2]),
        source(allowed, [2]),
        {
          identifier: `consume shared module (default) @patternfly/react-icons@* (fallback: /repo/${allowed})`,
          moduleType: 'consume-shared-module',
          chunks: [2],
          reasons: [],
        },
        {
          identifier: `provide shared module (default) @patternfly/react-icons@1.0 = /repo/${allowed}`,
          moduleType: 'provide-module',
          chunks: [2],
          reasons: [],
        },
      ]),
    );
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0]).toMatchObject({
      resource: legacy,
      owner: '@odh-dashboard/internal',
    });
    expect(report.runtimeModules.find((module) => module.resource === allowed).owner).toBe(
      '@patternfly/react-icons',
    );
  });

  it('should trace imports from a federated container entry', () => {
    const container = {
      identifier: 'container entry (default)',
      chunks: [1],
      reasons: [{ type: 'container entry' }],
    };
    const legacy = source(
      'frontend/src/legacy.ts',
      [2],
      [{ moduleIdentifier: container.identifier }],
    );
    const report = audit(stats([container, legacy]));
    expect(report.violations[0].importerPath).toEqual([
      'container entry (default)',
      'frontend/src/legacy.ts',
    ]);
  });

  it('should detect forbidden federation references and unverified external runtime modules', () => {
    const shared = {
      identifier: 'consume shared module (default) @odh-dashboard/kserve@*',
      moduleType: 'consume-shared-module',
      chunks: [2],
      reasons: [],
    };
    const external = {
      identifier: 'external "https://example.test/remote.js"',
      moduleType: 'javascript/dynamic',
      chunks: [2],
      reasons: [],
    };
    const report = audit(stats([entry(), shared, external]));
    expect(report.violations).toHaveLength(2);
    expect(
      report.violations.some((module) => module.reason === 'unverified-external-runtime'),
    ).toBe(true);
  });

  it('should audit child compilations without mixing their chunk IDs with the parent', () => {
    const input = stats();
    input.children = [
      stats([
        entry(),
        source('frontend/src/child.ts', [1], importedBy('distributions/rhaii/src/index.tsx')),
      ]),
    ];
    const report = audit(input);
    expect(report.violations[0].chunks).toEqual(['main.0:1']);
    expect(report.summary.runtimeModules).toBe(3);
  });

  it('should ignore inactive dependency reasons when explaining importer paths', () => {
    const leaf = source(
      'frontend/src/legacy.ts',
      [2],
      [{ ...importedBy('distributions/rhaii/src/index.tsx')[0], active: false }],
    );
    const report = audit(stats([entry(), leaf]));
    expect(report.violations[0].importerPath).toEqual([]);
    expect(report.boundaryEdges).toEqual([]);
    expect(report.boundaryPassed).toBe(false);
  });

  it.each(['filteredModules', 'filteredChildren', 'filteredReasons', 'filteredAssets'])(
    'should reject truncated statistics (%s)',
    (key) => {
      expect(() => audit({ ...stats(), [key]: 1 })).toThrow('Incomplete production stats');
    },
  );

  it('should reject truncation inside concatenated modules', () => {
    expect(() =>
      audit(
        stats([
          entry(),
          {
            ...source('packages/llmd-serving/wrapper.ts', [2]),
            modules: [{ filteredChildren: 1 }],
          },
        ]),
      ),
    ).toThrow('Incomplete production stats');
    expect(() =>
      audit(
        stats([
          entry(),
          { ...source('packages/llmd-serving/wrapper.ts', [2]), name: 'wrapper + 2 modules' },
        ]),
      ),
    ).toThrow('concatenated module contents missing');
  });

  it.each([
    {},
    { ...stats(), modules: [] },
    { ...stats(), chunks: [] },
    { ...stats(), errors: [{ message: 'Build failed' }] },
    stats([{ identifier: 'unknown', reasons: [], chunks: [999] }]),
  ])('should reject failed, empty, or incomplete build graphs', (input) => {
    expect(() => audit(input)).toThrow();
  });

  it('should render a failing boundary clearly and identify the browser-validation limitation', () => {
    const report = audit(
      stats([
        entry(),
        source('frontend/src/legacy.ts', [2], importedBy('distributions/rhaii/src/index.tsx')),
      ]),
    );
    const markdown = renderReport(report);
    expect(markdown).toContain('Boundary: **FAIL**');
    expect(markdown).toContain('frontend/src/legacy.ts');
    expect(markdown).toContain('browser/network validation');
  });

  describe('importer path examples', () => {
    const externalModule = (index = 0) => ({
      identifier: `external "https://example.test/remote-${index}.js"`,
      moduleType: 'javascript/dynamic',
      chunks: [2],
      reasons: importedBy('distributions/rhaii/src/index.tsx'),
    });
    const referenceModule = (index = 0) => ({
      identifier: `consume shared module (default) @odh-dashboard/kserve/ref-${index}@*`,
      moduleType: 'consume-shared-module',
      chunks: [2],
      reasons: importedBy('distributions/rhaii/src/index.tsx'),
    });
    const exampleSection = (report) => renderReport(report).split('## Importer Path Examples\n')[1];
    const exampleNames = (report) =>
      [...exampleSection(report).matchAll(/^- `(.+)`$/gm)].map((match) => match[1]);

    it.each([
      ['external', externalModule],
      ['reference-only', referenceModule],
    ])('should include %s violations without boundary edges', (_name, createModule) => {
      const module = createModule();
      const report = audit(stats([entry(), module]));
      expect(report.boundaryEdges).toEqual([]);
      expect(exampleNames(report)).toEqual([module.identifier]);
      expect(exampleSection(report)).toContain(
        `\`distributions/rhaii/src/index.tsx\` → \`${module.identifier}\``,
      );
    });

    it.each(['external', 'reference', 'boundary'])(
      'should retain all categories within ten examples when %s violations dominate',
      (dominantCategory) => {
        const count = (category) => (category === dominantCategory ? 11 : 1);
        const report = audit(
          stats([
            entry(),
            ...Array.from({ length: count('external') }, (_, index) => externalModule(index)),
            ...Array.from({ length: count('reference') }, (_, index) => referenceModule(index)),
            ...Array.from({ length: count('boundary') }, (_, index) =>
              source(
                `frontend/src/legacy-${index}.ts`,
                [2],
                importedBy('distributions/rhaii/src/index.tsx'),
              ),
            ),
          ]),
        );
        const names = exampleNames(report);
        const categories = names.map((name) => {
          if (name.startsWith('external ')) return 'external';
          if (name.startsWith('consume shared module ')) return 'reference';
          return 'boundary';
        });
        expect(names).toHaveLength(10);
        expect(new Set(names).size).toBe(10);
        expect(categories).toEqual(expect.arrayContaining(['external', 'reference', 'boundary']));
        expect(categories.indexOf('reference')).toBeGreaterThan(categories.lastIndexOf('external'));
        expect(categories.indexOf('boundary')).toBeGreaterThan(categories.lastIndexOf('reference'));
      },
    );

    it('should show a violation only once when multiple boundary edges reach it', () => {
      const first = 'packages/llmd-serving/first.ts';
      const second = 'packages/llmd-serving/second.ts';
      const report = audit(
        stats([
          entry(),
          source(first, [2], importedBy('distributions/rhaii/src/index.tsx')),
          source(second, [2], importedBy('distributions/rhaii/src/index.tsx')),
          source('frontend/src/legacy.ts', [2], [...importedBy(first), ...importedBy(second)]),
        ]),
      );
      expect(report.boundaryEdges).toHaveLength(2);
      expect(exampleNames(report)).toEqual(['frontend/src/legacy.ts']);
    });

    it('should include emitted violations with no active importer path', () => {
      const report = audit(stats([entry(), source('frontend/src/legacy.ts', [2])]));
      expect(report.boundaryEdges).toEqual([]);
      expect(exampleNames(report)).toEqual(['frontend/src/legacy.ts']);
      expect(exampleSection(report)).toContain(
        'No active entry path recorded; chunk membership still proves emission.',
      );
    });

    it('should leave the examples empty when the boundary passes', () => {
      const report = audit(stats());
      expect(report.boundaryPassed).toBe(true);
      expect(exampleNames(report)).toEqual([]);
    });
  });
});
