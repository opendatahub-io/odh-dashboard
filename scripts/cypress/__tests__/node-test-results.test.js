'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  parseNodeTestTapDetails,
  parseNodeTestTapTotals,
  renderNodeTestSummary,
  renderNodeTestMarkdown,
  validateNodeTestTapTotals,
} = require('../lib/node-test-results');

const tap = (totals) =>
  Object.entries(totals)
    .map(([key, value]) => `# ${key} ${value}`)
    .join('\n');

describe('Node test result summaries', () => {
  it('parses the final TAP totals', () => {
    const totals = parseNodeTestTapTotals(tap({ tests: 57, pass: 56, fail: 1, skipped: 0 }));

    assert.deepEqual(totals, { tests: 57, pass: 56, fail: 1, skipped: 0 });
  });

  it('counts cancelled tests as failures and reports the executed pass rate', () => {
    const totals = parseNodeTestTapTotals(
      tap({ tests: 4, pass: 2, fail: 1, cancelled: 1, skipped: 0, todo: 0 }),
    );

    assert.equal(validateNodeTestTapTotals(totals), null);
    assert.equal(
      renderNodeTestSummary(totals, { durationMs: 1250, failedTests: ['one', 'two'] }),
      [
        'E2E planner and result validation summary (Node)',
        'These checks test CI machinery; they do not run dashboard E2E journeys.',
        'Result: FAIL',
        'Tests: 4 total, 2 passed, 2 failed, 0 skipped, 0 todo',
        'Executed: 4',
        'Pass rate: 50.0%',
        'Duration: 1.25 seconds',
        '',
        'Failed tests:',
        '- one',
        '- two',
      ].join('\n'),
    );
  });

  it('parses duration and failed test names from TAP output', () => {
    const details = parseNodeTestTapDetails(
      ['ok 1 - passes', 'not ok 2 - fails', '# duration_ms 250'].join('\n'),
    );

    assert.deepEqual(details, { durationMs: 250, failedTests: ['fails'] });
  });

  it('does not list TODO or SKIP test points as failures', () => {
    const details = parseNodeTestTapDetails(
      [
        'not ok 1 - future behavior # TODO implement later',
        'not ok 2 - disabled # SKIP',
        'not ok 3 - real failure',
      ].join('\n'),
    );
    assert.deepEqual(details.failedTests, ['real failure']);
  });

  it('rejects runs where every test is skipped or TODO', () => {
    for (const totals of [
      { tests: 1, pass: 0, fail: 0, skipped: 1, todo: 0 },
      { tests: 1, pass: 0, fail: 0, skipped: 0, todo: 1 },
    ]) {
      assert.match(validateNodeTestTapTotals(totals), /no executed tests/);
    }
  });

  it('rejects incomplete or inconsistent totals', () => {
    assert.match(validateNodeTestTapTotals({}), /missing tests/);
    assert.match(
      validateNodeTestTapTotals({ tests: 3, pass: 1, fail: 1, skipped: 0 }),
      /do not add up/,
    );
  });

  it('rejects complete totals for an empty test run', () => {
    assert.match(
      validateNodeTestTapTotals({ tests: 0, pass: 0, fail: 0, skipped: 0 }),
      /contains no tests/,
    );
  });

  it('renders a readable job summary with individual results and failure names', () => {
    const markdown = renderNodeTestMarkdown(
      { tests: 2, pass: 1, fail: 1, skipped: 0, todo: 0 },
      {
        durationMs: 500,
        failedTests: ['rejects empty jobs'],
        testOutcomes: ['PASS: selects changed specs', 'FAIL: rejects empty jobs'],
      },
    );
    assert.match(markdown, /\*\*FAIL: 1\/2 checks passed in 0.50 seconds\.\*\*/);
    assert.match(markdown, /### Failed checks\n\n- rejects empty jobs/);
    assert.match(markdown, /<summary>Individual check results<\/summary>/);
    assert.match(markdown, /PASS: selects changed specs/);
    assert.match(markdown, /Browser E2E/);
    assert.ok(!markdown.includes('.tap'));
    assert.ok(!markdown.includes('/home/runner/'));
  });

  it('prints a concise human-readable summary from the CLI', async (test) => {
    const { spawnSync } = require('node:child_process');
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'node-test-results-'));
    test.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const tapFile = path.join(directory, 'results.tap');
    fs.writeFileSync(tapFile, `${tap({ tests: 2, pass: 2, fail: 0, skipped: 0 })}\n`);

    const result = spawnSync(
      process.execPath,
      ['scripts/cypress/summarize-node-test-results.js', tapFile],
      { encoding: 'utf8', cwd: path.join(__dirname, '../../..') },
    );

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Result: PASS/);
    assert.match(result.stdout, /Tests: 2 total, 2 passed, 0 failed, 0 skipped, 0 todo/);
  });
});
