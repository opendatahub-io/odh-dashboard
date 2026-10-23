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

    assert.ok(workflow.includes('--test-reporter=spec'));
    assert.ok(workflow.includes('--test-reporter-destination=stdout'));
    assert.ok(workflow.includes('--test-reporter=tap'));
    assert.ok(workflow.includes('--test-reporter-destination="$tap_file"'));
    assert.ok(workflow.includes('summarize-node-test-results.js "$tap_file"'));
    assert.ok(!workflow.includes('--test-reporter=dot'));
  });

  it('validates selection and results from the tested workflow head', () => {
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
    const testedRef = 'ref: ${{ github.event.workflow_run.head_sha || github.sha }}';

    assert.ok(validateStart !== -1 && validateEnd !== -1);
    assert.ok(summarizeStart !== -1 && summarizeEnd !== -1);
    assert.ok(validateJob.includes(testedRef));
    assert.ok(summarizeJob.includes(testedRef));
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
});
