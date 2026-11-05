'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const Mocha = require('mocha');
const JunitReporter = require('mocha-junit-reporter');
const { buildSpecInventory, buildSelectionPlan } = require('../lib/e2e-selection');
const { summarizeJunitFiles, validateResults } = require('../lib/e2e-results');

const root = path.join(__dirname, '../../..');
const helperFile = path.join(root, 'packages/cypress/cypress/support/testTags.ts');
const helper = {};
vm.runInThisContext(
  `(function(exports) { ${
    ts.transpileModule(fs.readFileSync(helperFile, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
  }\n})`,
  { filename: helperFile },
)(helper);

// Cypress accepts (title, options, callback); standard Mocha accepts (title, callback).
// Adapt only that signature, keeping real Mocha suite/test registration and reporting.
const cypressSignature = (original) =>
  Object.assign(
    (title, optionsOrFn, fn) => original(title, typeof optionsOrFn === 'object' ? fn : optionsOrFn),
    original,
  );

const verifyRuntime = async (test, source, { grepTags = ['@A'], skipTags = [], expected } = {}) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-filter-runtime-'));
  test.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const report = path.join(directory, 'junit.xml');
  const mocha = new Mocha({
    reporter: JunitReporter,
    reporterOptions: { mochaFile: report, includePending: true },
  });
  const context = {};
  mocha.suite.emit('pre-require', context, 'fixture.cy.ts', mocha);
  for (const name of ['it', 'describe', 'context']) {
    const original = context[name];
    context[name] = cypressSignature(original);
    context[name].only = cypressSignature(original.only);
    context[name].skip = cypressSignature(original.skip);
  }
  const tagsByTest = {};
  const { shouldSkipTest } = helper.createTestTagFilter(grepTags, skipTags);
  helper.installTestTagFilter(context, shouldSkipTest, (registered, tags) => {
    tagsByTest[registered.fullTitle()] = tags;
  });
  context.beforeEach(function checkRegisteredTags() {
    if (shouldSkipTest(tagsByTest[this.currentTest.fullTitle()] ?? [])) {
      this.skip();
    }
  });
  vm.runInNewContext(source, context);
  const failures = await new Promise((resolve) => {
    mocha.run(resolve);
  });
  assert.equal(failures, 0);

  const spec = 'packages/cypress/cypress/tests/e2e/fixture.cy.ts';
  const excludedTags = [
    ...skipTags,
    ...grepTags.filter((tag) => tag.startsWith('--')).map((tag) => tag.slice(2)),
  ];
  const inventory = buildSpecInventory({
    specs: [spec],
    readFile: () => source,
    skipTags: excludedTags,
    root,
  });
  const plan = buildSelectionPlan({
    changes: [],
    inventory,
    dependencyIndex: { consumers: {} },
    selectedTags: grepTags.filter((tag) => !tag.startsWith('--')),
    ciTags: ['@A', '@B'],
    root,
  });
  assert.equal(plan.valid, true, plan.errors.join('\n'));
  const totals = summarizeJunitFiles([report]);
  assert.deepEqual(totals, expected);
  assert.equal(validateResults(totals, plan.summary.plannedTestCount), null);
  return tagsByTest;
};

describe('Cypress runtime filtering agrees with planned JUnit counts', () => {
  it('omits children of skipped suites, including nested and aliased describe/context skips', async (test) => {
    await verifyRuntime(
      test,
      `
      describe('active', {tags: ['@A']}, () => {
        it('passes', () => {});
        describe.skip('disabled', () => {
          it('skipped child', () => { throw new Error('must not run'); });
          context('nested', () => it('nested child', () => {}));
        });
        const disabled = context.skip;
        disabled('aliased disabled', () => it('aliased child', () => {}));
        it.skip('explicitly skipped', {tags: ['@A']}, () => {});
      });
    `,
      { expected: { tests: 1, failures: 0, skipped: 0, executed: 1 } },
    );
  });

  it('keeps identically titled tests in differently tagged suites independent', async (test) => {
    const tags = await verifyRuntime(
      test,
      `
      describe('selected', {tags: ['@A']}, () => it('same title', () => {}));
      describe('excluded', {tags: ['@B']}, () => it('same title', () => {}));
    `,
      { expected: { tests: 1, failures: 0, skipped: 0, executed: 1 } },
    );
    assert.deepEqual(Object.keys(tags), ['selected same title']);
  });

  it('inherits nested suite tags and omits both grep-excluded and skip-tagged tests', async (test) => {
    await verifyRuntime(
      test,
      `
      describe('parent', {tags: ['@A']}, () => {
        context('nested', {tags: ['@B']}, () => it('inherits both', () => {}));
        it('quarantined', {tags: ['@Bug']}, () => {});
        it('maintenance', {tags: ['@Maintain']}, () => {});
      });
    `,
      {
        grepTags: ['@A', '--@Bug'],
        skipTags: ['@Bug', '@Maintain'],
        expected: { tests: 1, failures: 0, skipped: 0, executed: 1 },
      },
    );
  });

  it('preserves runtime skips as pending testcases while omitting static skips', async (test) => {
    await verifyRuntime(
      test,
      `
      describe('selected', {tags: ['@A']}, () => {
        it('passes', () => {});
        it('runtime skip', function () { this.skip(); });
        describe.skip('static skip', () => it('omitted', () => {}));
      });
    `,
      { expected: { tests: 2, failures: 0, skipped: 1, executed: 1 } },
    );
  });

  it('applies suite tags and exclusions to focused tests and suites', async (test) => {
    await verifyRuntime(
      test,
      `
      describe.only('focused', {tags: ['@A']}, () => {
        it.only('selected', () => {});
        it.only('excluded', {tags: ['@Bug']}, () => {});
      });
    `,
      { skipTags: ['@Bug'], expected: { tests: 1, failures: 0, skipped: 0, executed: 1 } },
    );
  });
});
