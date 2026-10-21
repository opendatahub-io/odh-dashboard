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

  it('uses the human-readable Node test reporter', () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, '../../../.github/workflows/cypress-e2e-test.yml'),
      'utf8',
    );

    assert.ok(workflow.includes('--test-reporter=spec'));
  });

  it('keeps backend logs hidden', () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, '../../../.github/workflows/cypress-e2e-test.yml'),
      'utf8',
    );

    assert.ok(workflow.includes('--hide 0'));
  });
});
