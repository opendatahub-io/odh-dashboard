const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { parseArgs, summarizeContexts } = require('../ci/audit-status-contexts');

describe('summarizeContexts', () => {
  it('groups check runs by app and workflow and legacy statuses by creator and context', () => {
    const summary = summarizeContexts([
      {
        __typename: 'CheckRun',
        name: 'Cypress shard 1',
        checkSuite: {
          app: { name: 'GitHub Actions' },
          workflowRun: { workflow: { name: 'Test' } },
        },
      },
      {
        __typename: 'CheckRun',
        name: 'Cypress shard 2',
        checkSuite: {
          app: { name: 'GitHub Actions' },
          workflowRun: { workflow: { name: 'Test' } },
        },
      },
      {
        __typename: 'StatusContext',
        context: 'ci/prow/unit',
        creator: { login: 'openshift-ci-robot' },
      },
    ]);

    assert.deepEqual(summary, [
      { producer: 'GitHub Actions', source: 'Test', count: 2 },
      { producer: 'openshift-ci-robot', source: 'ci/prow/unit', count: 1 },
    ]);
  });
});

describe('parseArgs', () => {
  it('uses the configured warning and failure thresholds', () => {
    assert.deepEqual(
      parseArgs([
        '--repo',
        'opendatahub-io/odh-dashboard',
        '--pr',
        '10095',
        '--warning-threshold',
        '80',
        '--budget',
        '90',
      ]),
      {
        repo: 'opendatahub-io/odh-dashboard',
        pr: 10095,
        warningThreshold: 80,
        budget: 90,
      },
    );
  });

  it('rejects a budget that does not leave room after the warning threshold', () => {
    assert.throws(
      () => parseArgs(['--repo', 'owner/repo', '--warning-threshold', '90', '--budget', '90']),
      /greater than --warning-threshold/,
    );
  });
});
