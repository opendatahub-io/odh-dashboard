'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  parseNodeTestTapTotals,
  renderNodeTestSummary,
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
      renderNodeTestSummary(totals),
      'E2E selection contracts: pass=2, fail=2, skipped=0, todo=0, total=4, pass_rate=50.0%',
    );
  });

  it('rejects incomplete or inconsistent totals', () => {
    assert.match(validateNodeTestTapTotals({}), /missing tests/);
    assert.match(
      validateNodeTestTapTotals({ tests: 3, pass: 1, fail: 1, skipped: 0 }),
      /do not add up/,
    );
  });

  it('prints a one-line summary from the CLI', async (test) => {
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
    assert.match(result.stdout, /pass=2, fail=0, skipped=0, todo=0, total=2/);
  });
});
