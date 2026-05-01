import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  splitRulesAndDescription,
  extractTsDescription,
  parseArgs,
  isGenerated,
  scanLine,
  inferPackage,
  aggregate,
  compareBaseline,
  generateMarkdownSummary,
  emitAnnotations,
} from './eslint-disable-audit.mjs';

// ── splitRulesAndDescription ────────────────────────────────────────────────

describe('splitRulesAndDescription', () => {
  it('returns empty rules and null description for null input', () => {
    assert.deepStrictEqual(splitRulesAndDescription(null), {
      rules: [],
      description: null,
    });
  });

  it('returns empty rules and null description for empty string', () => {
    assert.deepStrictEqual(splitRulesAndDescription(''), {
      rules: [],
      description: null,
    });
  });

  it('returns empty rules and null description for whitespace only', () => {
    assert.deepStrictEqual(splitRulesAndDescription('   '), {
      rules: [],
      description: null,
    });
  });

  it('parses a single rule', () => {
    assert.deepStrictEqual(splitRulesAndDescription('camelcase'), {
      rules: ['camelcase'],
      description: null,
    });
  });

  it('parses multiple comma-separated rules', () => {
    assert.deepStrictEqual(
      splitRulesAndDescription('camelcase, no-console'),
      { rules: ['camelcase', 'no-console'], description: null },
    );
  });

  it('parses rules with @ scoped names', () => {
    assert.deepStrictEqual(
      splitRulesAndDescription('@typescript-eslint/no-explicit-any'),
      { rules: ['@typescript-eslint/no-explicit-any'], description: null },
    );
  });

  it('parses rules with -- description', () => {
    assert.deepStrictEqual(
      splitRulesAndDescription('camelcase -- API returns snake_case'),
      { rules: ['camelcase'], description: 'API returns snake_case' },
    );
  });

  it('parses multiple rules with -- description', () => {
    assert.deepStrictEqual(
      splitRulesAndDescription(
        '@typescript-eslint/no-unnecessary-condition -- Record<string,T> can be undefined at runtime',
      ),
      {
        rules: ['@typescript-eslint/no-unnecessary-condition'],
        description: 'Record<string,T> can be undefined at runtime',
      },
    );
  });

  it('handles -- at the boundary with no description text', () => {
    assert.deepStrictEqual(splitRulesAndDescription('camelcase -- '), {
      rules: ['camelcase'],
      description: null,
    });
  });

  it('does not split on single dash', () => {
    assert.deepStrictEqual(
      splitRulesAndDescription('react-hooks/exhaustive-deps'),
      { rules: ['react-hooks/exhaustive-deps'], description: null },
    );
  });
});

// ── extractTsDescription ────────────────────────────────────────────────────

describe('extractTsDescription', () => {
  it('returns null for null input', () => {
    assert.strictEqual(extractTsDescription(null), null);
  });

  it('returns null for empty string', () => {
    assert.strictEqual(extractTsDescription(''), null);
  });

  it('returns null for whitespace only', () => {
    assert.strictEqual(extractTsDescription('   '), null);
  });

  it('extracts description after whitespace', () => {
    assert.strictEqual(
      extractTsDescription(' no types available'),
      'no types available',
    );
  });

  it('extracts description after colon', () => {
    assert.strictEqual(
      extractTsDescription(': Types are not available for this third-party library'),
      'Types are not available for this third-party library',
    );
  });

  it('extracts description after double-dash separator', () => {
    assert.strictEqual(
      extractTsDescription(' -- fetch might be undefined'),
      'fetch might be undefined',
    );
  });

  it('extracts description after en dash', () => {
    assert.strictEqual(
      extractTsDescription(' – fetch might be undefined in node'),
      'fetch might be undefined in node',
    );
  });

  it('returns null for only punctuation separators', () => {
    assert.strictEqual(extractTsDescription(' -- '), null);
  });
});

// ── parseArgs ───────────────────────────────────────────────────────────────

describe('parseArgs', () => {
  it('returns defaults with no arguments', () => {
    const args = parseArgs(['node', 'script.mjs']);
    assert.deepStrictEqual(args, {
      json: false,
      outputFile: null,
      baseline: null,
      saveBaseline: null,
      failOnIncrease: false,
      includeGenerated: false,
      githubSummary: null,
      githubAnnotations: false,
      help: false,
    });
  });

  it('parses --json flag', () => {
    const args = parseArgs(['node', 'script.mjs', '--json']);
    assert.strictEqual(args.json, true);
  });

  it('parses --baseline with file path', () => {
    const args = parseArgs([
      'node',
      'script.mjs',
      '--baseline',
      'baseline.json',
    ]);
    assert.strictEqual(args.baseline, 'baseline.json');
  });

  it('parses --save-baseline with file path', () => {
    const args = parseArgs([
      'node',
      'script.mjs',
      '--save-baseline',
      'out.json',
    ]);
    assert.strictEqual(args.saveBaseline, 'out.json');
  });

  it('parses --fail-on-increase flag', () => {
    const args = parseArgs(['node', 'script.mjs', '--fail-on-increase']);
    assert.strictEqual(args.failOnIncrease, true);
  });

  it('parses --include-generated flag', () => {
    const args = parseArgs(['node', 'script.mjs', '--include-generated']);
    assert.strictEqual(args.includeGenerated, true);
  });

  it('parses --help flag', () => {
    const args = parseArgs(['node', 'script.mjs', '--help']);
    assert.strictEqual(args.help, true);
  });

  it('parses all flags combined', () => {
    const args = parseArgs([
      'node',
      'script.mjs',
      '--json',
      '--baseline',
      'b.json',
      '--save-baseline',
      's.json',
      '--fail-on-increase',
      '--include-generated',
    ]);
    assert.strictEqual(args.json, true);
    assert.strictEqual(args.baseline, 'b.json');
    assert.strictEqual(args.saveBaseline, 's.json');
    assert.strictEqual(args.failOnIncrease, true);
    assert.strictEqual(args.includeGenerated, true);
  });
});

// ── isGenerated ─────────────────────────────────────────────────────────────

describe('isGenerated', () => {
  it('detects generated/ in path', () => {
    assert.strictEqual(
      isGenerated('packages/notebooks/frontend/src/generated/Workspaces.ts'),
      true,
    );
  });

  it('detects third_party/ in path', () => {
    assert.strictEqual(
      isGenerated('frontend/src/third_party/mlmd/generated/metadata.ts'),
      true,
    );
  });

  it('returns false for normal paths', () => {
    assert.strictEqual(
      isGenerated('frontend/src/components/MyComponent.tsx'),
      false,
    );
  });

  it('returns false for partial matches', () => {
    assert.strictEqual(
      isGenerated('frontend/src/auto-generated-name.ts'),
      false,
    );
  });

  it('is case-insensitive', () => {
    assert.strictEqual(
      isGenerated('packages/foo/Generated/output.ts'),
      true,
    );
  });
});

// ── scanLine ────────────────────────────────────────────────────────────────

describe('scanLine', () => {
  const fp = 'src/foo.ts';

  describe('eslint-disable-next-line', () => {
    it('detects // eslint-disable-next-line with single rule', () => {
      const hits = scanLine('  // eslint-disable-next-line camelcase', 10, fp);
      assert.strictEqual(hits.length, 1);
      assert.strictEqual(hits[0].type, 'eslint-disable-next-line-scoped');
      assert.deepStrictEqual(hits[0].rules, ['camelcase']);
      assert.strictEqual(hits[0].line, 10);
    });

    it('detects // eslint-disable-next-line with multiple rules', () => {
      const hits = scanLine(
        '// eslint-disable-next-line camelcase, no-console',
        5,
        fp,
      );
      assert.strictEqual(hits[0].type, 'eslint-disable-next-line-scoped');
      assert.deepStrictEqual(hits[0].rules, ['camelcase', 'no-console']);
    });

    it('detects // eslint-disable-next-line with description', () => {
      const hits = scanLine(
        '// eslint-disable-next-line camelcase -- API snake_case',
        1,
        fp,
      );
      assert.strictEqual(hits[0].description, 'API snake_case');
      assert.deepStrictEqual(hits[0].rules, ['camelcase']);
    });

    it('detects bare // eslint-disable-next-line', () => {
      const hits = scanLine('// eslint-disable-next-line', 1, fp);
      assert.strictEqual(hits[0].type, 'eslint-disable-next-line-bare');
      assert.deepStrictEqual(hits[0].rules, []);
    });

    it('detects /* eslint-disable-next-line camelcase */ (JSX style)', () => {
      const hits = scanLine(
        '      /* eslint-disable-next-line camelcase */',
        42,
        fp,
      );
      assert.strictEqual(hits.length, 1);
      assert.strictEqual(hits[0].type, 'eslint-disable-next-line-scoped');
      assert.deepStrictEqual(hits[0].rules, ['camelcase']);
    });

    it('detects {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}', () => {
      const hits = scanLine(
        '      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}',
        24,
        fp,
      );
      assert.strictEqual(hits.length, 1);
      assert.strictEqual(hits[0].type, 'eslint-disable-next-line-scoped');
      assert.deepStrictEqual(hits[0].rules, [
        '@typescript-eslint/ban-ts-comment',
      ]);
    });

    it('does NOT classify /* eslint-disable-next-line */ as block disable', () => {
      const hits = scanLine(
        '/* eslint-disable-next-line no-console */',
        1,
        fp,
      );
      assert.strictEqual(hits.length, 1);
      assert.notStrictEqual(hits[0].type, 'eslint-disable-block-scoped');
      assert.strictEqual(hits[0].type, 'eslint-disable-next-line-scoped');
    });
  });

  describe('eslint-disable-line', () => {
    it('detects // eslint-disable-line with rule', () => {
      const hits = scanLine(
        'const x = 1; // eslint-disable-line no-unused-vars',
        7,
        fp,
      );
      assert.strictEqual(hits[0].type, 'eslint-disable-line-scoped');
      assert.deepStrictEqual(hits[0].rules, ['no-unused-vars']);
    });

    it('detects bare // eslint-disable-line', () => {
      const hits = scanLine('const x = 1; // eslint-disable-line', 7, fp);
      assert.strictEqual(hits[0].type, 'eslint-disable-line-bare');
    });
  });

  describe('eslint-disable (block/file-level)', () => {
    it('detects /* eslint-disable camelcase */', () => {
      const hits = scanLine('/* eslint-disable camelcase */', 1, fp);
      assert.strictEqual(hits[0].type, 'eslint-disable-block-scoped');
      assert.deepStrictEqual(hits[0].rules, ['camelcase']);
    });

    it('detects /* eslint-disable camelcase -- reason */', () => {
      const hits = scanLine(
        '/* eslint-disable camelcase -- PipelineRun type uses snake_case */',
        1,
        fp,
      );
      assert.strictEqual(hits[0].type, 'eslint-disable-block-scoped');
      assert.deepStrictEqual(hits[0].rules, ['camelcase']);
      assert.strictEqual(
        hits[0].description,
        'PipelineRun type uses snake_case',
      );
    });

    it('detects bare /* eslint-disable */', () => {
      const hits = scanLine('/* eslint-disable */', 1, fp);
      assert.strictEqual(hits[0].type, 'eslint-disable-block-bare');
      assert.deepStrictEqual(hits[0].rules, []);
    });

    it('does NOT match /* eslint-disable-next-line */ as block', () => {
      const hits = scanLine('/* eslint-disable-next-line camelcase */', 1, fp);
      assert.strictEqual(hits.length, 1);
      assert.strictEqual(hits[0].type, 'eslint-disable-next-line-scoped');
    });

    it('does NOT match /* eslint-enable */', () => {
      const hits = scanLine('/* eslint-enable camelcase */', 1, fp);
      assert.strictEqual(hits.length, 0);
    });
  });

  describe('@ts-ignore', () => {
    it('detects // @ts-ignore', () => {
      const hits = scanLine('// @ts-ignore', 1, fp);
      assert.strictEqual(hits.length, 1);
      assert.strictEqual(hits[0].type, 'ts-ignore');
      assert.strictEqual(hits[0].description, null);
    });

    it('detects // @ts-ignore with description', () => {
      const hits = scanLine('// @ts-ignore no types available', 6, fp);
      assert.strictEqual(hits[0].type, 'ts-ignore');
      assert.strictEqual(hits[0].description, 'no types available');
    });

    it('detects {/* @ts-ignore */} (JSX)', () => {
      const hits = scanLine('      {/* @ts-ignore */}', 25, fp);
      assert.strictEqual(hits.length, 1);
      assert.strictEqual(hits[0].type, 'ts-ignore');
    });
  });

  describe('@ts-expect-error', () => {
    it('detects // @ts-expect-error', () => {
      const hits = scanLine('// @ts-expect-error', 1, fp);
      assert.strictEqual(hits[0].type, 'ts-expect-error');
      assert.strictEqual(hits[0].description, null);
    });

    it('detects // @ts-expect-error with colon description', () => {
      const hits = scanLine(
        '// @ts-expect-error: Types are not available for this library',
        4,
        fp,
      );
      assert.strictEqual(hits[0].type, 'ts-expect-error');
      assert.strictEqual(
        hits[0].description,
        'Types are not available for this library',
      );
    });

    it('detects // @ts-expect-error with en dash description', () => {
      const hits = scanLine(
        '// @ts-expect-error \u2013 fetch might be undefined in node',
        57,
        fp,
      );
      assert.strictEqual(hits[0].type, 'ts-expect-error');
      assert.strictEqual(
        hits[0].description,
        'fetch might be undefined in node',
      );
    });

    it('detects // @ts-expect-error with double-dash description', () => {
      const hits = scanLine(
        '// @ts-expect-error -- multiple inheritance hack',
        538,
        fp,
      );
      assert.strictEqual(hits[0].description, 'multiple inheritance hack');
    });
  });

  describe('@ts-nocheck', () => {
    it('detects // @ts-nocheck', () => {
      const hits = scanLine('// @ts-nocheck', 2, fp);
      assert.strictEqual(hits[0].type, 'ts-nocheck');
    });

    it('detects // @ts-nocheck with description', () => {
      const hits = scanLine(
        '// @ts-nocheck - Overlay file copied into the starter repo',
        2,
        fp,
      );
      assert.strictEqual(hits[0].type, 'ts-nocheck');
      assert.strictEqual(
        hits[0].description,
        'Overlay file copied into the starter repo',
      );
    });
  });

  describe('generated file flagging', () => {
    it('flags files in generated/ directories', () => {
      const hits = scanLine(
        '/* eslint-disable */',
        1,
        'packages/notebooks/frontend/src/generated/Workspaces.ts',
      );
      assert.strictEqual(hits[0].generated, true);
    });

    it('flags files in third_party/ directories', () => {
      const hits = scanLine(
        '// @ts-nocheck',
        1,
        'frontend/src/third_party/mlmd/generated/proto.ts',
      );
      assert.strictEqual(hits[0].generated, true);
    });

    it('does not flag normal files', () => {
      const hits = scanLine('// eslint-disable-next-line camelcase', 1, fp);
      assert.strictEqual(hits[0].generated, false);
    });
  });

  describe('no false positives', () => {
    it('does not match plain code', () => {
      const hits = scanLine('const disableButton = true;', 1, fp);
      assert.strictEqual(hits.length, 0);
    });

    it('does not match eslint-enable comments', () => {
      const hits = scanLine('/* eslint-enable camelcase */', 1, fp);
      assert.strictEqual(hits.length, 0);
    });

    it('does not match partial keyword in string', () => {
      const hits = scanLine(
        "const msg = 'use eslint-disable-next-line';",
        1,
        fp,
      );
      assert.strictEqual(hits.length, 0);
    });

    it('does not match @ts-ignore in a string literal', () => {
      const hits = scanLine("const x = '@ts-ignore this';", 1, fp);
      assert.strictEqual(hits.length, 0);
    });
  });
});

// ── inferPackage ────────────────────────────────────────────────────────────

describe('inferPackage', () => {
  it('identifies frontend/src as frontend', () => {
    assert.strictEqual(inferPackage('frontend/src/app/App.tsx'), 'frontend');
  });

  it('identifies frontend/config as frontend', () => {
    assert.strictEqual(
      inferPackage('frontend/config/webpack.common.js'),
      'frontend',
    );
  });

  it('identifies backend', () => {
    assert.strictEqual(inferPackage('backend/src/server.ts'), 'backend');
  });

  it('identifies packages/<name>', () => {
    assert.strictEqual(
      inferPackage('packages/autorag/frontend/src/hooks.ts'),
      'packages/autorag',
    );
  });

  it('falls back to root for unknown paths', () => {
    assert.strictEqual(inferPackage('.eslintrc.js'), 'root');
  });
});

// ── aggregate ───────────────────────────────────────────────────────────────

describe('aggregate', () => {
  const sampleHits = [
    {
      file: 'src/a.ts',
      line: 1,
      type: 'eslint-disable-next-line-scoped',
      rules: ['camelcase'],
      description: null,
      generated: false,
    },
    {
      file: 'src/a.ts',
      line: 5,
      type: 'eslint-disable-next-line-scoped',
      rules: ['camelcase'],
      description: 'reason',
      generated: false,
    },
    {
      file: 'src/b.ts',
      line: 1,
      type: 'eslint-disable-block-bare',
      rules: [],
      description: null,
      generated: false,
    },
    {
      file: 'src/generated/c.ts',
      line: 1,
      type: 'ts-nocheck',
      rules: [],
      description: null,
      generated: true,
    },
    {
      file: 'src/d.ts',
      line: 10,
      type: 'ts-ignore',
      rules: [],
      description: 'no types',
      generated: false,
    },
  ];

  it('counts by type correctly', () => {
    const result = aggregate(sampleHits, false);
    assert.strictEqual(result.byType['eslint-disable-next-line-scoped'], 2);
    assert.strictEqual(result.byType['eslint-disable-block-bare'], 1);
    assert.strictEqual(result.byType['ts-ignore'], 1);
    assert.strictEqual(result.byType['ts-nocheck'], 0);
  });

  it('includes generated files when includeGenerated is true', () => {
    const result = aggregate(sampleHits, true);
    assert.strictEqual(result.byType['ts-nocheck'], 1);
    assert.strictEqual(result.summary.totalDirectives, 5);
  });

  it('excludes generated files by default', () => {
    const result = aggregate(sampleHits, false);
    assert.strictEqual(result.summary.totalDirectives, 4);
  });

  it('always reports generated files in critical section', () => {
    const result = aggregate(sampleHits, false);
    assert.strictEqual(result.critical.generatedFiles.length, 1);
    assert.strictEqual(result.critical.generatedFiles[0], 'src/generated/c.ts');
  });

  it('counts descriptions correctly', () => {
    const result = aggregate(sampleHits, false);
    assert.strictEqual(result.summary.withDescription, 2);
    assert.strictEqual(result.summary.withoutDescription, 2);
  });

  it('aggregates rules correctly', () => {
    const result = aggregate(sampleHits, false);
    const camelcaseEntry = result.byRule.find((r) => r.rule === 'camelcase');
    assert.strictEqual(camelcaseEntry.count, 2);
  });

  it('counts unique files', () => {
    const result = aggregate(sampleHits, false);
    assert.strictEqual(result.summary.totalFiles, 3);
  });

  it('tracks bare disables in critical section', () => {
    const result = aggregate(sampleHits, false);
    assert.strictEqual(result.critical.bareDisables.length, 1);
    assert.strictEqual(result.critical.bareDisables[0].file, 'src/b.ts');
  });

  it('sorts byRule by count descending, then name ascending', () => {
    const hits = [
      ...sampleHits,
      {
        file: 'src/e.ts',
        line: 1,
        type: 'eslint-disable-next-line-scoped',
        rules: ['no-console'],
        description: null,
        generated: false,
      },
      {
        file: 'src/e.ts',
        line: 2,
        type: 'eslint-disable-next-line-scoped',
        rules: ['no-console'],
        description: null,
        generated: false,
      },
      {
        file: 'src/e.ts',
        line: 3,
        type: 'eslint-disable-next-line-scoped',
        rules: ['alpha-rule'],
        description: null,
        generated: false,
      },
    ];
    const result = aggregate(hits, false);
    // camelcase=2, no-console=2 -> tie broken alphabetically: camelcase first
    assert.strictEqual(result.byRule[0].rule, 'camelcase');
    assert.strictEqual(result.byRule[0].count, 2);
    assert.strictEqual(result.byRule[1].rule, 'no-console');
    assert.strictEqual(result.byRule[1].count, 2);
    assert.strictEqual(result.byRule[2].rule, 'alpha-rule');
    assert.strictEqual(result.byRule[2].count, 1);
  });
});

// ── compareBaseline ─────────────────────────────────────────────────────────

describe('compareBaseline', () => {
  const makeReport = (overrides = {}) => ({
    byType: {
      'eslint-disable-next-line-scoped': 100,
      'eslint-disable-next-line-bare': 2,
      'eslint-disable-block-scoped': 50,
      'eslint-disable-block-bare': 1,
      'eslint-disable-line-scoped': 10,
      'eslint-disable-line-bare': 0,
      'ts-ignore': 5,
      'ts-expect-error': 3,
      'ts-nocheck': 2,
      ...overrides.byType,
    },
    byRule: overrides.byRule || [
      { rule: 'camelcase', count: 80 },
      { rule: 'no-console', count: 20 },
    ],
    critical: {
      bareDisables: overrides.bareDisables || [
        { file: 'a.ts', line: 10, type: 'eslint-disable-next-line-bare' },
      ],
      generatedFiles: [],
    },
  });

  it('reports no changes when identical', () => {
    const current = makeReport();
    const baseline = makeReport();
    const result = compareBaseline(current, baseline);
    assert.strictEqual(result.deltas.length, 0);
    assert.strictEqual(result.hasRegression, false);
    assert.strictEqual(result.newBare.length, 0);
  });

  it('detects regression when type count increases', () => {
    const baseline = makeReport();
    const current = makeReport({
      byType: { 'eslint-disable-next-line-scoped': 105 },
    });
    const result = compareBaseline(current, baseline);
    assert.strictEqual(result.hasRegression, true);
    const typeDelta = result.deltas.find(
      (d) => d.category === 'eslint-disable-next-line-scoped',
    );
    assert.strictEqual(typeDelta.delta, 5);
    assert.strictEqual(typeDelta.status, 'REGRESSION');
  });

  it('detects improvement when type count decreases', () => {
    const baseline = makeReport();
    const current = makeReport({
      byType: { 'eslint-disable-next-line-scoped': 95 },
    });
    const result = compareBaseline(current, baseline);
    assert.strictEqual(result.hasRegression, false);
    const typeDelta = result.deltas.find(
      (d) => d.category === 'eslint-disable-next-line-scoped',
    );
    assert.strictEqual(typeDelta.delta, -5);
    assert.strictEqual(typeDelta.status, 'IMPROVED');
  });

  it('detects new bare disables', () => {
    const baseline = makeReport();
    const current = makeReport({
      bareDisables: [
        { file: 'a.ts', line: 10, type: 'eslint-disable-next-line-bare' },
        { file: 'b.ts', line: 20, type: 'eslint-disable-block-bare' },
      ],
    });
    const result = compareBaseline(current, baseline);
    assert.strictEqual(result.hasRegression, true);
    assert.strictEqual(result.newBare.length, 1);
    assert.strictEqual(result.newBare[0].file, 'b.ts');
  });

  it('detects new rule that did not exist in baseline', () => {
    const baseline = makeReport();
    const current = makeReport({
      byRule: [
        { rule: 'camelcase', count: 80 },
        { rule: 'no-console', count: 20 },
        { rule: 'new-rule', count: 3 },
      ],
    });
    const result = compareBaseline(current, baseline);
    assert.strictEqual(result.hasRegression, true);
    const newRuleDelta = result.deltas.find(
      (d) => d.category === 'rule: new-rule',
    );
    assert.strictEqual(newRuleDelta.delta, 3);
  });

  it('handles empty baseline gracefully', () => {
    const baseline = { byType: {}, byRule: [], critical: {} };
    const current = makeReport();
    const result = compareBaseline(current, baseline);
    assert.strictEqual(result.hasRegression, true);
    assert.ok(result.deltas.length > 0);
  });
});

// ── generateMarkdownSummary ─────────────────────────────────────────────────

describe('generateMarkdownSummary', () => {
  const makeReport = () => ({
    summary: {
      totalDirectives: 1400,
      totalFiles: 774,
      withDescription: 44,
      withoutDescription: 1356,
    },
    byType: {
      'eslint-disable-next-line-scoped': 816,
      'eslint-disable-next-line-bare': 2,
      'eslint-disable-block-scoped': 407,
      'eslint-disable-block-bare': 1,
      'eslint-disable-line-scoped': 129,
      'eslint-disable-line-bare': 1,
      'ts-ignore': 32,
      'ts-expect-error': 7,
      'ts-nocheck': 5,
    },
    byRule: [
      { rule: 'camelcase', count: 643 },
      { rule: 'no-console', count: 132 },
    ],
    byFile: [{ file: 'src/a.ts', count: 39 }],
    byPackage: [
      { package: 'frontend', count: 351 },
      { package: 'packages/autorag', count: 162 },
    ],
    critical: {
      bareDisables: [
        { file: 'src/a.ts', line: 34, type: 'eslint-disable-next-line-bare' },
      ],
      generatedFiles: ['src/generated/x.ts'],
    },
  });

  it('produces valid markdown', () => {
    const md = generateMarkdownSummary(makeReport(), null);
    assert.ok(md.includes('## ESLint Disable Audit'));
    assert.ok(md.includes('1,400'));
    assert.ok(md.includes('774'));
  });

  it('includes summary table', () => {
    const md = generateMarkdownSummary(makeReport(), null);
    assert.ok(md.includes('Total directives'));
    assert.ok(md.includes('Files affected'));
    assert.ok(md.includes('Documented'));
    assert.ok(md.includes('Undocumented'));
  });

  it('includes suppression type table', () => {
    const md = generateMarkdownSummary(makeReport(), null);
    assert.ok(md.includes('eslint-disable-next-line-scoped'));
    assert.ok(md.includes('816'));
    assert.ok(md.includes('Critical'));
  });

  it('includes bare disables section', () => {
    const md = generateMarkdownSummary(makeReport(), null);
    assert.ok(md.includes('Bare Disables'));
    assert.ok(md.includes('src/a.ts'));
  });

  it('includes collapsible rules section', () => {
    const md = generateMarkdownSummary(makeReport(), null);
    assert.ok(md.includes('<details>'));
    assert.ok(md.includes('Top 15 Suppressed Rules'));
    assert.ok(md.includes('camelcase'));
  });

  it('includes collapsible package breakdown', () => {
    const md = generateMarkdownSummary(makeReport(), null);
    assert.ok(md.includes('Per-Package Breakdown'));
    assert.ok(md.includes('frontend'));
  });

  it('includes generated files note', () => {
    const md = generateMarkdownSummary(makeReport(), null);
    assert.ok(md.includes('1 generated/third-party'));
  });

  it('shows no-change banner when comparison has no deltas', () => {
    const comparison = { deltas: [], hasRegression: false, newBare: [] };
    const md = generateMarkdownSummary(makeReport(), comparison);
    assert.ok(md.includes('No changes from baseline'));
  });

  it('shows regression banner when comparison has regressions', () => {
    const comparison = {
      deltas: [
        { category: 'ts-ignore', baseline: 30, current: 35, delta: 5, status: 'REGRESSION' },
      ],
      hasRegression: true,
      newBare: [],
    };
    const md = generateMarkdownSummary(makeReport(), comparison);
    assert.ok(md.includes('Regressions detected'));
    assert.ok(md.includes('Changes from Baseline'));
    assert.ok(md.includes('+5'));
  });

  it('shows improvement banner when comparison has only improvements', () => {
    const comparison = {
      deltas: [
        { category: 'camelcase', baseline: 650, current: 643, delta: -7, status: 'IMPROVED' },
      ],
      hasRegression: false,
      newBare: [],
    };
    const md = generateMarkdownSummary(makeReport(), comparison);
    assert.ok(md.includes('Improvements detected'));
  });

  it('shows new bare disables in comparison', () => {
    const comparison = {
      deltas: [],
      hasRegression: true,
      newBare: [{ file: 'src/new.ts', line: 10, type: 'eslint-disable-next-line-bare' }],
    };
    const md = generateMarkdownSummary(makeReport(), comparison);
    assert.ok(md.includes('New Bare Disables'));
    assert.ok(md.includes('src/new.ts:10'));
  });
});

// ── emitAnnotations ─────────────────────────────────────────────────────────

describe('emitAnnotations', () => {
  it('is a callable function', () => {
    assert.strictEqual(typeof emitAnnotations, 'function');
  });
});

// ── parseArgs (new flags) ───────────────────────────────────────────────────

describe('parseArgs (github and output flags)', () => {
  it('parses --github-summary with file path', () => {
    const args = parseArgs(['node', 'script.mjs', '--github-summary', '/tmp/summary.md']);
    assert.strictEqual(args.githubSummary, '/tmp/summary.md');
  });

  it('parses --github-annotations flag', () => {
    const args = parseArgs(['node', 'script.mjs', '--github-annotations']);
    assert.strictEqual(args.githubAnnotations, true);
  });

  it('parses --output-file with file path', () => {
    const args = parseArgs(['node', 'script.mjs', '--output-file', 'results.json']);
    assert.strictEqual(args.outputFile, 'results.json');
  });

  it('defaults github and output flags to off', () => {
    const args = parseArgs(['node', 'script.mjs']);
    assert.strictEqual(args.githubSummary, null);
    assert.strictEqual(args.githubAnnotations, false);
    assert.strictEqual(args.outputFile, null);
  });
});
