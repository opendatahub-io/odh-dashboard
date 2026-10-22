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

const validateNodeTestTapTotals = (totals) => {
  for (const field of ['tests', 'pass', 'fail', 'skipped']) {
    if (!Number.isInteger(totals[field])) {
      return `Node test summary is missing ${field}`;
    }
  }

  const failures = (totals.fail ?? 0) + (totals.cancelled ?? 0);
  const accounted = (totals.pass ?? 0) + failures + (totals.skipped ?? 0) + (totals.todo ?? 0);
  if (accounted !== totals.tests) {
    return `Node test totals do not add up: ${accounted} accounted tests, ${totals.tests} total`;
  }

  return null;
};

const renderNodeTestSummary = (totals) => {
  const failures = (totals.fail ?? 0) + (totals.cancelled ?? 0);
  const todo = totals.todo ?? 0;
  const executed = totals.tests - totals.skipped - todo;
  const passRate = executed > 0 ? ((totals.pass / executed) * 100).toFixed(1) : '0.0';

  return (
    `E2E selection contracts: pass=${totals.pass}, fail=${failures}, ` +
    `skipped=${totals.skipped}, todo=${todo}, total=${totals.tests}, ` +
    `pass_rate=${passRate}%`
  );
};

module.exports = {
  parseNodeTestTapTotals,
  renderNodeTestSummary,
  validateNodeTestTapTotals,
};
