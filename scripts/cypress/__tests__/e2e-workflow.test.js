'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

describe('Cypress E2E workflow', () => {
  it('defines valid YAML for both contract-test workflows', () => {
    const yaml = require('yaml');
    for (const file of ['cypress-e2e-test.yml', 'test.yml']) {
      const workflow = yaml.parse(
        fs.readFileSync(path.join(__dirname, '../../../.github/workflows', file), 'utf8'),
      );
      assert.ok(workflow.jobs);
    }
  });

  it('passes explicit specs through the Cypress CLI instead of an ignored environment variable', () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, '../../../.github/workflows/cypress-e2e-test.yml'),
      'utf8',
    );

    assert.ok(workflow.includes('CYPRESS_COMMAND+=" --spec $ESCAPED_SPEC_LIST"'));
    assert.ok(!workflow.includes('export CYPRESS_spec='));
  });

  it('labels Node checks separately and uses the shared contract runner', () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, '../../../.github/workflows/cypress-e2e-test.yml'),
      'utf8',
    );

    assert.ok(workflow.includes('name: Test E2E planner and result validation (Node)'));
    assert.ok(workflow.includes('run: node scripts/cypress/run-e2e-contracts.js'));
    assert.ok(workflow.includes('name: Browser E2E (${{ matrix.tag_dir }})'));
    assert.ok(workflow.includes('name: Explain what this browser job runs and why'));
    assert.ok(workflow.includes('MATRIX_SELECTION_REASON: ${{ matrix.reason }}'));
    assert.ok(workflow.includes('MATRIX_PLANNED_TEST_COUNT: ${{ matrix.planned_test_count }}'));
    const runner = fs.readFileSync(path.join(__dirname, '../run-e2e-contracts.js'), 'utf8');
    assert.ok(runner.includes('--test-reporter=tap'));
    assert.ok(runner.includes('No browser, dashboard, or cluster is started.'));
    assert.ok(runner.includes('e2e-runtime.test.js'));
    assert.ok(runner.includes('Historical simulations'));
  });

  it('uses protected revisions for automatic validator jobs', () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, '../../../.github/workflows/cypress-e2e-test.yml'),
      'utf8',
    );
    const validateStart = workflow.indexOf('  validate-selection:');
    const validateEnd = workflow.indexOf('  select-cluster:', validateStart);
    const summarizeStart = workflow.indexOf('  summarize-e2e-results:');
    const summarizeEnd = workflow.indexOf('  set-final-status:', summarizeStart);
    const validateJob = workflow.slice(validateStart, validateEnd);
    const summarizeJob = workflow.slice(summarizeStart, summarizeEnd);
    const protectedRevision =
      "ref: ${{ github.event_name == 'workflow_run' && github.event.repository.default_branch || github.ref }}";

    assert.ok(validateStart !== -1 && validateEnd !== -1);
    assert.ok(summarizeStart !== -1 && summarizeEnd !== -1);
    assert.ok(validateJob.includes(protectedRevision));
    assert.ok(summarizeJob.includes(protectedRevision));
    assert.ok(!validateJob.includes('workflow_run.head_sha || github.sha'));
    assert.ok(!summarizeJob.includes('workflow_run.head_sha || github.sha'));
  });

  it('keeps backend logs hidden', () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, '../../../.github/workflows/cypress-e2e-test.yml'),
      'utf8',
    );

    assert.ok(workflow.includes('--hide 0'));
  });

  it('uses the explicit path-impact planner instead of Turbo-based E2E selection', () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, '../../../.github/workflows/cypress-e2e-test.yml'),
      'utf8',
    );

    assert.ok(workflow.includes('node scripts/cypress/plan-e2e-selection.js'));
    assert.ok(!workflow.includes('turbo run lint --dry=json'));
    assert.ok(!workflow.includes('name: Detect changed areas'));
  });

  it('aligns pending JUnit testcases with the planned test count', () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, '../../../.github/workflows/cypress-e2e-test.yml'),
      'utf8',
    );
    const cypressConfig = fs.readFileSync(
      path.join(__dirname, '../../../packages/cypress/cypress.config.ts'),
      'utf8',
    );

    assert.ok(cypressConfig.includes('includePending: true'));
    assert.ok(workflow.includes('export CYPRESS_grepOmitFiltered=true'));
    assert.ok(workflow.includes('SKIP_TAGS_GREP="--@Bug --@Maintain --@NonConcurrent"'));
    assert.ok(workflow.includes('export CYPRESS_grepTags="$SKIP_TAGS_GREP"'));
    assert.ok(workflow.includes('export CYPRESS_grepTags="$MATRIX_TAG $SKIP_TAGS_GREP"'));
  });

  it('records and looks up runtime tags using the full suite and test identity', () => {
    const support = fs.readFileSync(
      path.join(__dirname, '../../../packages/cypress/cypress/support/e2e.ts'),
      'utf8',
    );
    assert.ok(support.includes('installTestTagFilter(window, shouldSkipTest'));
    assert.ok(support.includes('Cypress.testTags[test.fullTitle()] = tags'));
    assert.ok(support.includes('Cypress.testTags[this.currentTest.fullTitle()] ?? []'));
  });

  it('tests PR-head contracts in an unprivileged pull_request job', () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, '../../../.github/workflows/test.yml'),
      'utf8',
    );
    const job = workflow.slice(
      workflow.indexOf('  E2E-Contracts:'),
      workflow.indexOf('  Unit-Tests:'),
    );
    assert.match(workflow, /on:\s+pull_request:/);
    assert.ok(job.includes('runs-on: ubuntu-latest'));
    assert.ok(job.includes('contents: read'));
    assert.ok(job.includes('persist-credentials: false'));
    assert.ok(job.includes('github.event.pull_request.head.sha || github.sha'));
    assert.ok(job.includes('run: node scripts/cypress/run-e2e-contracts.js'));
    assert.ok(!job.includes('secrets.'));
    assert.ok(!job.includes('self-hosted'));
  });

  it('anchors default, relative, and absolute report directories to the Cypress configuration', () => {
    const vm = require('node:vm');
    const ts = require('typescript');
    const configFile = path.join(__dirname, '../../../packages/cypress/cypress.config.ts');
    const source = ts.createSourceFile(
      configFile,
      fs.readFileSync(configFile, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    let initializer;
    const visit = (node) => {
      if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'resultsDir') {
        initializer = node.initializer.getText(source);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    for (const directory of [
      undefined,
      'relative-reports',
      path.resolve('/tmp/absolute-reports'),
    ]) {
      for (const mock of [false, true]) {
        const value = vm.runInNewContext(initializer, {
          path,
          __dirname: path.dirname(configFile),
          env: { CY_RESULTS_DIR: directory, CY_MOCK: mock },
        });
        assert.equal(
          value,
          path.resolve(path.dirname(configFile), directory || 'results', mock ? 'mocked' : 'e2e'),
        );
        assert.ok(path.isAbsolute(value));
      }
    }
  });
});
