const { it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { readBasePackages, planDistributionImpact } = require('../lib/distribution-test-impact');

it('selects dashboard-only, portal-only, shared, documentation and infrastructure Git changes', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mock-applications-git-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = path.resolve(__dirname, '../../..');
  const workflow = fs.readFileSync(path.join(source, '.github/workflows/test.yml'), 'utf8');
  const selectionStep = workflow
    .split('        name: Select Cypress mock test groups\n')[1]
    .split('\n  Contract-Tests:')[0];
  const script = selectionStep.split('        run: |\n')[1].replace(/^ {10}/gm, '');
  const write = (file, contents) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), contents);
  };
  const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  const commit = () => {
    git(['add', '.']);
    git([
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.test',
      '-c',
      'commit.gpgsign=false',
      '-c',
      'core.hooksPath=/dev/null',
      'commit',
      '--quiet',
      '-m',
      'Test change',
    ]);
    return git(['rev-parse', 'HEAD']).trim();
  };
  for (const file of [
    'scripts/cypress/plan-mock-test-applications.js',
    'scripts/cypress/mock-test-applications.json',
    'scripts/cypress/plan-mock-test-impact.js',
    'scripts/cypress/lib/distribution-test-impact.js',
    'scripts/cypress/lib/mock-test-impact.js',
    'scripts/query-workspace-packages.js',
    'scripts/generate-cypress-test-matrix.js',
  ]) {
    write(file, fs.readFileSync(path.join(source, file)));
  }
  const { packageManager } = JSON.parse(fs.readFileSync(path.join(source, 'package.json'), 'utf8'));
  write(
    'package.json',
    JSON.stringify({ name: 'application-selection-test', private: true, packageManager }),
  );
  write('pnpm-workspace.yaml', 'packages:\n  - frontend\n  - packages/*\n  - distributions/*\n');
  for (const [workspace, name, dependencies] of [
    ['frontend', 'odh-dashboard-frontend', { shared: 'workspace:*' }],
    ['packages/cypress', '@odh-dashboard/cypress', {}],
    ['packages/shared', 'shared', {}],
    [
      'distributions/maas-portal',
      '@odh-dashboard/maas-portal-distribution',
      { shared: 'workspace:*' },
    ],
  ]) {
    write(`${workspace}/package.json`, JSON.stringify({ name, dependencies }));
  }
  write('packages/cypress/cypress/tests/mocked/app.cy.ts', "describe('app', () => {});\n");
  write(
    '.gitignore',
    'node_modules\nselection-output\ncypress-mock-matrix.json\ncypress-mock-scope.txt\n',
  );
  fs.symlinkSync(path.join(source, 'node_modules'), path.join(root, 'node_modules'), 'dir');
  git(['init', '--quiet']);
  let base = commit();

  // Reuse this Git workspace to verify that removed manifests remain in the base graph.
  const currentPackages = [
    {
      name: '@odh-dashboard/maas-portal-distribution',
      path: 'distributions/maas-portal',
      dependencies: {},
    },
  ];
  const basePackages = readBasePackages(root, base, currentPackages, [
    { status: 'D', path: 'packages/shared/package.json' },
  ]);
  assert.equal(basePackages.find((pkg) => pkg.name === 'shared').path, 'packages/shared');
  assert.equal(
    planDistributionImpact({
      target: currentPackages[0].name,
      packages: currentPackages,
      basePackages,
      changes: [{ status: 'D', path: 'packages/shared/deleted.ts' }],
    }).run,
    true,
  );

  for (const [file, applications] of [
    ['frontend/src/app.ts', ['dashboard']],
    ['distributions/maas-portal/src/app.ts', ['maas-portal']],
    ['packages/shared/src/app.ts', ['dashboard', 'maas-portal']],
    ['README.md', []],
    ['.github/workflows/test.yml', ['dashboard', 'maas-portal']],
    ['distributions/maas-portal/src/__tests__/cypress/portal.cy.ts', ['maas-portal']],
  ]) {
    write(file, file.endsWith('.md') ? '# Documentation\n' : 'export const changed = true;\n');
    const head = commit();
    const matrixFile = path.join(root, 'cypress-mock-matrix.json');
    const outputFile = path.join(root, 'selection-output');
    fs.writeFileSync(outputFile, '');
    execFileSync('bash', ['-e', '-o', 'pipefail', '-c', script], {
      cwd: root,
      env: {
        ...process.env,
        IMPACT_BASE: base,
        IMPACT_HEAD: head,
        RUNNER_TEMP: root,
        GITHUB_OUTPUT: outputFile,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const matrix = JSON.parse(fs.readFileSync(matrixFile, 'utf8'));
    assert.deepEqual(
      [
        ...new Set(
          matrix.filter(({ application }) => application).map(({ application }) => application),
        ),
      ],
      applications,
      `Unexpected application selection for ${file}`,
    );
    const output = fs.readFileSync(outputFile, 'utf8');
    const outputs = Object.fromEntries(
      output
        .trim()
        .split('\n')
        .map((line) => {
          const separator = line.indexOf('=');
          return [line.slice(0, separator), line.slice(separator + 1)];
        }),
    );
    assert.equal(outputs['full-dashboard-matrix'], String(applications.includes('dashboard')));
    const expectedMatrix = applications.length
      ? matrix
      : [{ name: 'no-cypress-mock-tests', specs: [] }];
    assert.deepEqual(JSON.parse(outputs['test-groups']), expectedMatrix);
    assert.match(output, new RegExp(`has-tests=${applications.length > 0}\\n`));
    assert.match(
      output,
      new RegExp(`has-dashboard-tests=${applications.includes('dashboard')}\\n`),
    );
    assert.match(
      output,
      new RegExp(
        `full-matrix=${
          applications.includes('dashboard') && applications.includes('maas-portal')
        }\\n`,
      ),
    );
    base = head;
  }
});
