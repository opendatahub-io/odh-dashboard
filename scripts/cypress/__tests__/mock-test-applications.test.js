const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const applications = require('../mock-test-applications.json');
const { planApplications, validateApplications } = require('../plan-mock-test-applications');

const dashboardShards = [
  { name: 'shard-01', specs: ['../packages/cypress/keys.cy.ts'] },
  { name: 'shard-02', specs: ['../packages/observability/dashboard.cy.ts'] },
];
const plan = (dashboard = [], workspace = false, scope = 'none', entries = applications) =>
  planApplications({
    root: '/repository',
    entries,
    selectDashboard: () => ({ matrix: dashboard, scope, reason: 'dashboard selection' }),
    selectWorkspace: () => ({ run: workspace, reason: 'workspace selection' }),
  });

describe('application-aware Cypress mock matrix', () => {
  it('keeps dashboard shard selectors and result paths', () => {
    const result = plan(dashboardShards, false, 'full');
    assert.equal(result.scope, 'select');
    assert.ok(result.matrix.every(({ coverageComplete }) => coverageComplete));
    assert.ok(
      plan(dashboardShards, true, 'partial')
        .matrix.filter(({ runner }) => runner === 'dashboard-shards')
        .every(({ coverageComplete }) => coverageComplete === false),
    );
    assert.deepEqual(
      result.matrix.map(({ specs }) => specs),
      dashboardShards.map(({ specs }) => specs),
    );
    assert.ok(
      result.matrix.every(
        ({ runner, workspace, results }) =>
          runner === 'dashboard-shards' &&
          workspace === 'frontend' &&
          results === 'packages/cypress/results/mocked',
      ),
    );
  });

  it('runs portal-only changes without dashboard builds', () => {
    const result = plan([], true);
    assert.equal(result.scope, 'select');
    assert.deepEqual(result.matrix, [
      {
        application: 'maas-portal',
        workspace: 'distributions/maas-portal',
        runner: 'standalone-app',
        results: 'distributions/maas-portal/src/__tests__/cypress/results',
        name: 'maas-portal',
        specs: [],
      },
    ]);
  });

  it('selects a complete coverage matrix only when every application runs', () => {
    const result = plan(dashboardShards, true, 'full');
    assert.equal(result.matrix.length, 3);
    assert.equal(result.scope, 'full');
    assert.equal(result.matrix.filter(({ runner }) => runner === 'dashboard-shards').length, 2);
    assert.equal(new Set(result.matrix.map(({ name }) => name)).size, 3);
    assert.equal(plan(dashboardShards, true, 'select').scope, 'select');
  });

  it('returns an empty matrix when no application is affected', () => {
    const result = plan();
    assert.equal(result.scope, 'none');
    assert.deepEqual(result.matrix, []);
  });

  it('registers another workspace application without a workflow change', () => {
    const extra = {
      application: 'rhaii',
      workspace: 'distributions/rhaii',
      target: '@odh-dashboard/rhaii-distribution',
      runner: 'standalone-app',
      results: 'distributions/rhaii/cypress/results',
    };
    const called = [];
    const result = planApplications({
      root: '/repository',
      entries: [...applications, extra],
      options: { base: 'base-ref', head: 'head-ref' },
      selectDashboard: () => ({ matrix: [], scope: 'none' }),
      selectWorkspace: (root, options) => {
        assert.equal(root, '/repository');
        assert.equal(options.base, 'base-ref');
        assert.equal(options.head, 'head-ref');
        called.push(options.target);
        return { run: options.target === extra.target };
      },
    });
    assert.deepEqual(called, [applications[1].target, extra.target]);
    assert.deepEqual(
      result.matrix.map(({ workspace }) => workspace),
      [extra.workspace],
    );
  });

  it('rejects ambiguous applications, unsafe paths, and unsupported runners', () => {
    const portal = applications[1];
    for (const change of [
      { application: 'dashboard' },
      { workspace: '../outside' },
      { workspace: 'frontend' },
      { results: '/tmp/results' },
      { results: 'packages/another/results' },
      { runner: 'unknown' },
      { target: '' },
      { application: undefined },
    ]) {
      assert.throws(
        () => validateApplications([applications[0], { ...portal, ...change }]),
        /Invalid/,
      );
    }
    assert.throws(() => validateApplications([portal]), /Exactly one dashboard/);
  });

  it('writes a complete conservative matrix and scope when history is missing', (t) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mock-applications-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const matrix = path.join(directory, 'matrix.json');
    const scope = path.join(directory, 'scope');
    execFileSync(
      process.execPath,
      [
        path.resolve(__dirname, '../plan-mock-test-applications.js'),
        '--base',
        'missing-application-selection-revision',
        '--matrix',
        matrix,
        '--scope',
        scope,
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const entries = JSON.parse(fs.readFileSync(matrix, 'utf8'));
    assert.ok(entries.some(({ runner }) => runner === 'dashboard-shards'));
    assert.ok(entries.some(({ application }) => application === 'maas-portal'));
    assert.equal(fs.readFileSync(scope, 'utf8'), 'full\n');
  });
});

const { dashboardChanges } = require('../plan-mock-test-impact');

describe('dashboard application boundaries', () => {
  it('excludes standalone source, tests and manifests while retaining shared dependencies', () => {
    const shared = { status: 'M', path: 'packages/gen-ai/frontend/src/app/Chatbot.tsx' };
    const infrastructure = { status: 'M', path: 'pnpm-lock.yaml' };
    const lookalike = { status: 'M', path: 'distributions/maas-portal-other/src/app.tsx' };
    const changes = [
      { status: 'M', path: 'distributions/maas-portal/src/index.tsx' },
      { status: 'M', path: 'distributions/maas-portal/src/__tests__/cypress/test.cy.ts' },
      { status: 'M', path: 'distributions/maas-portal/package.json' },
      { status: 'D', path: 'distributions/maas-portal/src/removed.tsx' },
      shared,
      infrastructure,
      lookalike,
    ];
    assert.deepEqual(dashboardChanges(changes, ['distributions/maas-portal']), [
      shared,
      infrastructure,
      lookalike,
    ]);
    assert.deepEqual(dashboardChanges(changes, []), changes);
  });
});

const workflow = fs.readFileSync(
  path.resolve(__dirname, '../../../.github/workflows/test.yml'),
  'utf8',
);
const section = (name) => workflow.split(`\n  ${name}:\n`)[1]?.split(/\n {2}[A-Z][^\n]*:\n/)[0];
const step = (job, name) =>
  section(job).match(new RegExp(` {6}- name: ${name}\\n([\\s\\S]*?)(?=\\n {6}- |$)`))[1];

describe('shared Cypress workflow routing', () => {
  it('selects every application through the shared planner and removes dedicated portal handling', () => {
    assert.match(
      section('Get-Test-Groups'),
      /node scripts\/cypress\/plan-mock-test-applications\.js/,
    );
    assert.match(section('Get-Test-Groups'), /--scope "\$RUNNER_TEMP\/cypress-mock-scope\.txt"/);
    assert.doesNotMatch(workflow, /MaaS-Portal-Cypress-Mock-Tests:|portal-impact|portal_selected/);
    assert.match(
      section('Cypress-Mock-Tests'),
      /fromJson\(needs.Get-Test-Groups.outputs.test-groups\)/,
    );
  });

  it('builds and restores dashboard assets only for dashboard selections', () => {
    assert.match(
      section('Cypress-Setup'),
      /if: needs.Get-Test-Groups.outputs.has-dashboard-tests == 'true'/,
    );
    assert.match(section('Cypress-Mock-Tests'), /outputs.has-dashboard-tests != 'true'/);
    assert.match(
      step('Cypress-Mock-Tests', 'Restore dashboard Cypress builds'),
      /if: matrix.test-group.runner == 'dashboard-shards'/,
    );
    assert.match(
      step('Cypress-Mock-Tests', 'Run dashboard shard Cypress mock tests'),
      /if: matrix.test-group.runner == 'dashboard-shards'/,
    );
  });

  for (const exitCode of [0, 7]) {
    it(`runs the standalone app command without dashboard builds and preserves exit ${exitCode}`, (t) => {
      const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-mock-run-'));
      t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
      const standaloneStep = step('Cypress-Mock-Tests', 'Run standalone app Cypress mock tests');
      assert.match(standaloneStep, /if: matrix.test-group.runner == 'standalone-app'/);
      assert.match(
        standaloneStep,
        /APPLICATION_WORKSPACE: \$\{\{ matrix.test-group.workspace \}\}/,
      );
      const command = standaloneStep.match(/run: ([^\n]+)/)[1];
      const log = path.join(directory, 'args');
      const result = spawnSync(
        'bash',
        [
          '-e',
          '-o',
          'pipefail',
          '-c',
          `pnpm() {
        printf '%s\\n' "$@" > "$COMMAND_LOG"
        return "$COMMAND_EXIT"
      }
      ${command}`,
        ],
        {
          env: {
            ...process.env,
            APPLICATION_WORKSPACE: 'distributions/maas-portal',
            COMMAND_LOG: log,
            COMMAND_EXIT: String(exitCode),
          },
          encoding: 'utf8',
        },
      );
      assert.equal(result.status, exitCode, result.stdout + result.stderr);
      assert.equal(
        fs.readFileSync(log, 'utf8'),
        '--dir\ndistributions/maas-portal\nrun\ntest:cypress-ci\n',
      );
    });
  }

  it('merges application coverage through the existing reporting flow', () => {
    assert.match(
      step('Cypress-Mock-Tests', 'Upload Cypress Mock results'),
      /path: \$\{\{ matrix.test-group.results \}\}/,
    );
    const upload = step('Cypress-Mock-Tests', 'Upload Cypress coverage');
    assert.match(upload, /outputs.has-tests == 'true'/);
    assert.match(upload, /runner == 'dashboard-shards' && 'packages\/cypress\/coverage'/);
    assert.match(upload, /format\('\{0\}\/coverage', matrix.test-group.results\)/);
    const standaloneUpload = step(
      'Cypress-Mock-Tests',
      'Upload standalone app Cypress coverage to Codecov',
    );
    assert.match(standaloneUpload, /runner == 'standalone-app'/);
    assert.match(standaloneUpload, /env.IS_DRAFT != 'true'/);
    assert.match(standaloneUpload, /flags: cypress-mock-\$\{\{ matrix.test-group.application \}\}/);
    assert.match(
      standaloneUpload,
      /file: \$\{\{ matrix.test-group.results \}\}\/coverage\/coverage-final.json/,
    );
    assert.match(
      step('Cypress-Mock-Tests', 'Run standalone app Cypress mock tests'),
      /COVERAGE: true/,
    );
    assert.match(
      step('Combine-Results-and-Upload', 'Merge Cypress coverage reports'),
      /outputs.has-tests == 'true'/,
    );
    assert.match(
      step('Combine-Results-and-Upload', 'Upload Cypress mock coverage to Codecov'),
      /outputs.full-dashboard-matrix == 'true'/,
    );
  });
});

describe('shared Cypress coverage merge', () => {
  const mergeStep = step('Combine-Results-and-Upload', 'Merge Cypress coverage reports');
  const script = mergeStep.split('        run: |\n')[1].replace(/^ {10}/gm, '');
  const coverage = (file, hits) => ({
    [file]: {
      path: file,
      statementMap: { 0: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } } },
      fnMap: {},
      branchMap: {},
      s: { 0: hits },
      f: {},
      b: {},
    },
  });

  for (const runners of [
    ['maas-portal'],
    ['dashboard-shard-01'],
    ['dashboard-shard-01', 'maas-portal'],
  ]) {
    it(`merges reports for ${runners.join(' and ')}`, (t) => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cypress-coverage-merge-'));
      t.after(() => fs.rmSync(root, { recursive: true, force: true }));
      const bin = path.join(root, 'bin');
      fs.mkdirSync(bin);
      fs.writeFileSync(
        path.join(bin, 'pnpm'),
        '#!/bin/sh\nshift 2\nexec "$NODE_BIN" "$NYC_BIN" "$@"\n',
        { mode: 0o755 },
      );
      const source = '/repository/packages/shared/src/component.ts';
      runners.forEach((runner, index) => {
        const type = runner.startsWith('dashboard-') ? 'dashboard-shards' : 'standalone-app';
        const directory = path.join(root, 'all-artifacts', `cypress-coverage-${type}-${runner}`);
        fs.mkdirSync(directory, { recursive: true });
        fs.writeFileSync(
          path.join(directory, 'coverage-final.json'),
          JSON.stringify(coverage(source, index + 1)),
        );
      });
      execFileSync('bash', ['-e', '-o', 'pipefail', '-c', script], {
        cwd: root,
        env: {
          ...process.env,
          PATH: `${bin}${path.delimiter}${process.env.PATH}`,
          NODE_BIN: process.execPath,
          NYC_BIN: require.resolve('nyc/bin/nyc.js'),
        },
        stdio: 'pipe',
      });
      const merged = JSON.parse(
        fs.readFileSync(path.join(root, 'cypress-coverage/merged-cypress-coverage.json'), 'utf8'),
      );
      assert.deepEqual(Object.keys(merged), [source]);
      assert.equal(merged[source].s[0], runners.length === 1 ? 1 : 3);
      const dashboardReport = path.join(
        root,
        'dashboard-cypress-coverage/merged-dashboard-coverage.json',
      );
      assert.equal(fs.existsSync(dashboardReport), runners.includes('dashboard-shard-01'));
      if (fs.existsSync(dashboardReport)) {
        const dashboard = JSON.parse(fs.readFileSync(dashboardReport, 'utf8'));
        assert.equal(dashboard[source].s[0], 1, 'Portal hits must not enter the dashboard flag');
      }
    });
  }
});

describe('shared matrix job eligibility', () => {
  const expression = section('Cypress-Mock-Tests').match(/ {4}if: >-\n([\s\S]*?)\n {4}runs-on:/)[1];
  const eligible = (dashboard, setupResult = 'skipped', selectionResult = 'success') => {
    const needs = {
      Setup: { result: 'success' },
      'Get-Test-Groups': {
        result: selectionResult,
        outputs: { 'has-dashboard-tests': String(dashboard) },
      },
      'Get-Cypress-Packages': { result: 'success' },
      'Cypress-Setup': { result: setupResult },
    };
    const evaluated = expression
      .replace(/\$\{\{|\}\}/g, '')
      .replace(/always\(\)/g, 'true')
      .replace(/needs\.([\w-]+)\.(result|outputs\.[\w-]+)/g, (_, job, field) => {
        const value = field.split('.').reduce((object, key) => object[key], needs[job]);
        return JSON.stringify(value);
      });
    // Evaluate the workflow's boolean expression with only the substituted test values.
    return require('node:vm').runInNewContext(evaluated);
  };

  it('runs portal-only and no-op matrices when dashboard setup is intentionally skipped', () => {
    assert.equal(eligible(false), true);
  });

  it('requires dashboard builds when dashboard shards are selected', () => {
    assert.equal(eligible(true, 'success'), true);
    for (const result of ['failure', 'cancelled', 'skipped']) {
      assert.equal(eligible(true, result), false);
    }
  });

  it('does not accept failed or skipped application selection', () => {
    assert.equal(eligible(false, 'skipped', 'failure'), false);
    assert.equal(eligible(false, 'skipped', 'skipped'), false);
  });
});
