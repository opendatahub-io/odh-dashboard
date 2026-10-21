'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  parseJunitXml,
  renderResultsMarkdown,
  summarizeJunitFiles,
  validateResults,
} = require('../lib/e2e-results');

const junitXml = (attributes) => `<testsuite name="example" ${attributes}></testsuite>`;

describe('parseJunitXml', () => {
  it('sums tests, failures, errors, and skipped counts', () => {
    const totals = parseJunitXml(
      [
        junitXml('tests="3" failures="1" errors="0" skipped="1"'),
        junitXml('tests="2" failures="0" errors="1" skipped="0"'),
      ].join(''),
    );

    assert.deepEqual(totals, { tests: 5, failures: 2, skipped: 1 });
  });
});

describe('summarizeJunitFiles', () => {
  it('aggregates multiple JUnit files and reports executed count', async (test) => {
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-results-'));
    test.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    fs.writeFileSync(
      path.join(directory, 'one.xml'),
      junitXml('tests="2" failures="1" skipped="0"'),
    );
    fs.writeFileSync(
      path.join(directory, 'two.xml'),
      junitXml('tests="2" failures="0" skipped="1"'),
    );

    const totals = summarizeJunitFiles([
      path.join(directory, 'one.xml'),
      path.join(directory, 'two.xml'),
    ]);

    assert.deepEqual(totals, { tests: 4, failures: 1, skipped: 1, executed: 3 });
  });
});

describe('findJunitReports', () => {
  it('prefers merged reports over individual Cypress JUnit files', async (test) => {
    const { findJunitReports } = require('../summarize-e2e-results');
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-results-'));
    test.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    fs.mkdirSync(path.join(directory, 'junit'), { recursive: true });
    fs.writeFileSync(path.join(directory, 'junit', 'one.xml'), junitXml('tests="1"'));
    fs.writeFileSync(path.join(directory, 'junit-report.xml'), junitXml('tests="1"'));

    assert.deepEqual(findJunitReports(directory), [path.join(directory, 'junit-report.xml')]);
  });
});

describe('validateResults', () => {
  it('fails when no tests execute', () => {
    assert.match(
      validateResults({ tests: 0, failures: 0, skipped: 0, executed: 0 }),
      /No Cypress tests executed/,
    );
  });

  it('fails when every selected test is skipped', () => {
    assert.match(
      validateResults({ tests: 2, failures: 0, skipped: 2, executed: 0 }),
      /Every selected Cypress test was skipped/,
    );
  });

  it('accepts a run with at least one executed test', () => {
    assert.equal(validateResults({ tests: 2, failures: 0, skipped: 1, executed: 1 }), null);
  });

  it('fails when a job executes fewer tests than planned', () => {
    assert.match(
      validateResults({ tests: 1, failures: 0, skipped: 0, executed: 1 }, 2),
      /Expected 2 Cypress test\(s\), but found 1/,
    );
  });

  it('accepts a job that executes the planned number of tests', () => {
    assert.equal(validateResults({ tests: 2, failures: 0, skipped: 0, executed: 2 }, 2), null);
  });
});

describe('summarize-e2e-results CLI', () => {
  it('validates each matrix job independently', async (test) => {
    const { spawnSync } = require('node:child_process');
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-results-cli-'));
    test.after(() => fs.rmSync(directory, { recursive: true, force: true }));

    const writeReport = (jobDir, attributes) => {
      const reportDir = path.join(directory, 'packages/cypress/results', jobDir);
      fs.mkdirSync(reportDir, { recursive: true });
      fs.writeFileSync(path.join(reportDir, 'junit-report.xml'), junitXml(attributes));
    };
    writeReport('job-one', 'tests="2" failures="0" errors="0" skipped="0"');
    writeReport('job-two', 'tests="0" failures="0" errors="0" skipped="0"');
    const tagDirKey = 'tag_dir';
    const plannedTestCountKey = 'planned_test_count';
    const matrix = JSON.stringify([
      { [tagDirKey]: 'job-one', [plannedTestCountKey]: 2 },
      { [tagDirKey]: 'job-two', [plannedTestCountKey]: 2 },
    ]);

    const result = spawnSync(
      process.execPath,
      [
        'scripts/cypress/summarize-e2e-results.js',
        '--results-dir',
        directory,
        '--matrix-json',
        matrix,
      ],
      { encoding: 'utf8', cwd: path.join(__dirname, '../../..') },
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /job-two: Expected 2 Cypress test\(s\), but found 0/);
  });
});

describe('renderResultsMarkdown', () => {
  it('reports executed, failed, skipped, and total counts', () => {
    const markdown = renderResultsMarkdown({ tests: 4, failures: 1, skipped: 1, executed: 3 });

    assert.match(markdown, /Executed: 3/);
    assert.match(markdown, /Failed: 1/);
    assert.match(markdown, /Skipped: 1/);
    assert.match(markdown, /Total: 4/);
  });
});
