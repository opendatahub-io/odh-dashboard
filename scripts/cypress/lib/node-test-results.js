'use strict';

const parseNodeTestTapTotals = (tap) => {
  const totals = {};
  const totalPattern = /^# (tests|pass|fail|cancelled|skipped|todo) (\d+)$/;

  for (const line of String(tap).split('\n')) {
    const match = totalPattern.exec(line.trim());
    if (match) {
      totals[match[1]] = Number(match[2]);
    }
  }

  return totals;
};

const parseNodeTestTapDetails = (tap) => {
  const lines = String(tap)
    .split('\n')
    .map((line) => line.trim());
  const duration = lines.find((line) => /^# duration_ms /.test(line));
  const failedTests = lines
    .filter((line) => /^not ok \d+ - /.test(line))
    .map((line) => line.replace(/^not ok \d+ - /, ''));

  return {
    durationMs: duration ? Number(duration.replace(/^# duration_ms /, '')) : undefined,
    failedTests,
  };
};

const validateNodeTestTapTotals = (totals) => {
  for (const field of ['tests', 'pass', 'fail', 'skipped']) {
    if (!Number.isInteger(totals[field])) {
      return `Node test summary is missing ${field}`;
    }
  }

  if (totals.tests <= 0) {
    return 'Node test summary contains no tests';
  }

  const failures = (totals.fail ?? 0) + (totals.cancelled ?? 0);
  const accounted = (totals.pass ?? 0) + failures + (totals.skipped ?? 0) + (totals.todo ?? 0);
  if (accounted !== totals.tests) {
    return `Node test totals do not add up: ${accounted} accounted tests, ${totals.tests} total`;
  }

  return null;
};

const renderNodeTestSummary = (totals, details = {}) => {
  const failures = (totals.fail ?? 0) + (totals.cancelled ?? 0);
  const todo = totals.todo ?? 0;
  const executed = totals.tests - totals.skipped - todo;
  const passRate = executed > 0 ? ((totals.pass / executed) * 100).toFixed(1) : '0.0';
  const duration =
    details.durationMs === undefined
      ? undefined
      : `${(details.durationMs / 1000).toFixed(2)} seconds`;
  const failedTests = details.failedTests ?? [];

  return [
    'E2E selection contract summary',
    `Result: ${failures === 0 ? 'PASS' : 'FAIL'}`,
    `Tests: ${totals.tests} total, ${totals.pass} passed, ${failures} failed, ` +
      `${totals.skipped} skipped, ${todo} todo`,
    `Executed: ${executed}`,
    `Pass rate: ${passRate}%`,
    ...(duration ? [`Duration: ${duration}`] : []),
    ...(failedTests.length > 0
      ? ['', 'Failed tests:', ...failedTests.map((name) => `- ${name}`)]
      : []),
  ].join('\n');
};

module.exports = {
  parseNodeTestTapDetails,
  parseNodeTestTapTotals,
  renderNodeTestSummary,
  validateNodeTestTapTotals,
};
