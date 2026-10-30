'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

describe('Cypress E2E workflow', () => {
  it('passes explicit specs through the Cypress CLI instead of an ignored environment variable', () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, '../../../.github/workflows/cypress-e2e-test.yml'),
      'utf8',
    );

    assert.ok(workflow.includes('CYPRESS_COMMAND+=" --spec $ESCAPED_SPEC_LIST"'));
    assert.ok(!workflow.includes('export CYPRESS_spec='));
  });

  it('prints named test results and a human-readable Node test summary', () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, '../../../.github/workflows/cypress-e2e-test.yml'),
      'utf8',
    );

    assert.ok(workflow.includes('--test-reporter=tap'));
    assert.ok(workflow.includes('--test-reporter-destination="$tap_file"'));
    assert.ok(workflow.includes('summarize-node-test-results.js "$tap_file"'));
    assert.ok(!workflow.includes('--test-reporter=spec'));
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

  it('filters excluded tags before Cypress creates testcases', () => {
    const support = fs.readFileSync(
      path.join(__dirname, '../../../packages/cypress/cypress/support/e2e.ts'),
      'utf8',
    );

    assert.ok(support.includes('const grepIncludedTags ='));
    assert.ok(support.includes('const grepExcludedTags ='));
    assert.ok(support.includes('return undefined as unknown as Mocha.Test;'));
    assert.ok(support.includes('return shouldSkip || isExcluded || !shouldRun;'));
    assert.ok(support.includes('if (grepIncludedTags.length > 0)'));
    assert.ok(support.includes('grepIncludedTags.some((tag: string)'));
  });
});
