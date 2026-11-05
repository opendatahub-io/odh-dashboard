'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  parseNodeTestTapDetails,
  parseNodeTestTapTotals,
  renderNodeTestSummary,
  validateNodeTestTapTotals,
} = require('./lib/node-test-results');

const groups = [
  [
    'e2e-selection.test.js',
    'Selection rules',
    'changed specs, tags, dependency impact, and coverage gaps',
  ],
  [
    'e2e-runtime.test.js',
    'Runtime filtering',
    'real Mocha registration and JUnit counts agree with the planner',
  ],
  [
    'e2e-results.test.js',
    'Cypress result validation',
    'missing reports, skipped tests, and per-job planned counts',
  ],
  [
    'e2e-workflow.test.js',
    'Workflow wiring',
    'CLI arguments, protected validators, and PR-head contract checks',
  ],
  [
    'e2e-historical-impact.test.js',
    'Historical simulations',
    'past changed-file lists select the expected coverage; no cluster replay',
  ],
  [
    'node-test-results.test.js',
    'Node summary reporting',
    'TAP totals, failed-test names, and empty-run rejection',
  ],
];

console.log('Testing the E2E planner, runtime filtering, and result validation in Node.');
console.log('These are CI machinery checks. No browser, dashboard, or cluster is started.');
for (const [file, label, purpose] of groups) {
  console.log(`- ${label}: ${purpose} (${file})`);
}

const directory =
  process.env.RUNNER_TEMP || fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-contracts-'));
const tapFile = path.join(directory, 'e2e-selection-contracts.tap');
const result = spawnSync(
  process.execPath,
  [
    '--test',
    '--test-reporter=tap',
    ...groups.map(([file]) => path.join(__dirname, '__tests__', file)),
  ],
  { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
);
const tap = result.stdout || '';
fs.writeFileSync(tapFile, tap);
console.log('::group::Node contract test names and outcomes');
console.log(
  tap
    .split('\n')
    .filter((line) => /^\s*(?:not )?ok \d+ - /.test(line))
    .join('\n'),
);
console.log('::endgroup::');
if (result.stderr) {
  process.stderr.write(result.stderr);
}
const totals = parseNodeTestTapTotals(tap);
const validationError = validateNodeTestTapTotals(totals);
const summary = validationError || renderNodeTestSummary(totals, parseNodeTestTapDetails(tap));
console.log(summary);
console.log(`Full TAP report: ${tapFile}`);
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `### E2E CI machinery checks (Node)\n\n${summary}\n`,
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
