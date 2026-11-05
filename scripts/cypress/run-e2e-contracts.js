'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  parseNodeTestTapDetails,
  parseNodeTestTapTotals,
  renderNodeTestSummary,
  renderNodeTestMarkdown,
  validateNodeTestTapTotals,
} = require('./lib/node-test-results');

const testFiles = [
  'e2e-selection.test.js',
  'e2e-runtime.test.js',
  'e2e-results.test.js',
  'e2e-workflow.test.js',
  'e2e-historical-impact.test.js',
  'node-test-results.test.js',
];

console.log('Checking the code that selects browser tests and validates their results.');
console.log(
  'These tests catch omitted specs, incorrect tag filtering, and empty or incomplete results.',
);
console.log(
  'No browser, dashboard, or cluster is started. Browser results are in the Browser E2E jobs.',
);
const result = spawnSync(
  process.execPath,
  [
    '--test',
    '--test-reporter=tap',
    ...testFiles.map((file) => path.join(__dirname, '__tests__', file)),
  ],
  { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
);
const tap = result.stdout || '';
const testOutcomes = tap
  .split('\n')
  .filter((line) => /^\s*(?:not )?ok \d+ - /.test(line))
  .map((line) =>
    line.replace(/^(\s*)(not )?ok \d+ - /, (_, indent, failed) => {
      let outcome = failed ? 'FAIL' : 'PASS';
      if (/\s# TODO\b/i.test(line)) {
        outcome = 'TODO';
      } else if (/\s# SKIP\b/i.test(line)) {
        outcome = 'SKIP';
      }
      return `${indent}${outcome}: `;
    }),
  );
console.log('::group::Individual Node check results');
console.log(testOutcomes.join('\n'));
console.log('::endgroup::');
if (result.stderr) {
  process.stderr.write(result.stderr);
}
const totals = parseNodeTestTapTotals(tap);
const validationError = validateNodeTestTapTotals(totals);
const details = { ...parseNodeTestTapDetails(tap), testOutcomes };
const summary = validationError || renderNodeTestSummary(totals, details);
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    validationError
      ? `## Test-selection code checks (Node)\n\n**FAIL:** ${validationError}\n`
      : `${renderNodeTestMarkdown(totals, details)}\n`,
  );
}
if (
  result.error ||
  result.status !== 0 ||
  validationError ||
  totals.fail > 0 ||
  totals.cancelled > 0
) {
  console.error(result.error?.message || 'E2E CI machinery validation failed.');
  console.log('::group::Full Node failure diagnostics (TAP)');
  console.log(tap);
  console.log('::endgroup::');
  process.exitCode = result.status || 1;
}
