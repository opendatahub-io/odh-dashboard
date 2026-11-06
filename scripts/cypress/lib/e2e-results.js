'use strict';

const parseJunitAttributes = (tag) => {
  const attributes = {};
  const attributePattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)="([^"]*)"/g;
  let match = attributePattern.exec(tag);
  while (match !== null) {
    const [, name, value] = match;
    attributes[name] = value;
    match = attributePattern.exec(tag);
  }
  return attributes;
};

const parseJunitXml = (xml) => {
  const totals = {
    tests: 0,
    failures: 0,
    skipped: 0,
  };
  const testcasePattern = /<testcase\b[^>]*\/>|<testcase\b[^>]*>[\s\S]*?<\/testcase>/g;
  const testcases = xml.match(testcasePattern) ?? [];
  totals.tests = testcases.length;
  for (const testcase of testcases) {
    if (/<failure\b/.test(testcase)) {
      totals.failures += 1;
    }
    if (/<error\b/.test(testcase)) {
      totals.failures += 1;
    }
    if (/<skipped\b/.test(testcase)) {
      totals.skipped += 1;
    }
  }
  return totals;
};

const summarizeJunitFiles = (files) => {
  const totals = {
    tests: 0,
    failures: 0,
    skipped: 0,
  };
  for (const file of files) {
    const xml = require('fs').readFileSync(file, 'utf8');
    const fileTotals = parseJunitXml(xml);
    totals.tests += fileTotals.tests;
    totals.failures += fileTotals.failures;
    totals.skipped += fileTotals.skipped;
  }
  return {
    ...totals,
    executed: totals.tests - totals.skipped,
  };
};

const validateResults = (totals, plannedTestCount) => {
  const errors = [];
  if (plannedTestCount !== undefined && totals.tests !== plannedTestCount) {
    errors.push(
      `Coverage differs from plan: expected ${plannedTestCount} Cypress test(s), reported ${totals.tests}. Check for job timeouts, cancellations, or hook failures`,
    );
  }
  if (totals.tests === 0) {
    errors.push('No Cypress tests executed');
  }
  if (totals.failures > 0) {
    errors.push(`${totals.failures} Cypress test(s) failed`);
  }
  if (totals.tests > 0 && totals.skipped === totals.tests) {
    errors.push('Every selected Cypress test was skipped');
  }
  return errors.length > 0 ? errors.join('; ') : null;
};

const renderResultsMarkdown = (totals) =>
  [
    '# Cypress E2E results summary',
    '',
    `- Executed: ${totals.executed}`,
    `- Failed: ${totals.failures}`,
    `- Skipped: ${totals.skipped}`,
    `- Total reported: ${totals.tests}`,
    ...(totals.plannedTestCount !== undefined
      ? [`- Expected from CI selection: ${totals.plannedTestCount}`]
      : []),
    '',
    'Test failures and execution completeness are checked independently. A count mismatch can indicate interrupted coverage even when some tests passed.',
    ...(totals.jobs
      ? [
          '',
          '## Jobs',
          ...totals.jobs.map(
            (job) =>
              `- ${job.tagDir}: executed=${job.executed}, failed=${job.failures}, skipped=${job.skipped}, total=${job.tests}, expected=${job.plannedTestCount}`,
          ),
        ]
      : []),
    ...(totals.validationErrors?.length > 0
      ? ['', '## Validation failures', ...totals.validationErrors.map((error) => `- ${error}`)]
      : []),
  ]
    .concat('')
    .join('\n');

module.exports = {
  parseJunitAttributes,
  parseJunitXml,
  renderResultsMarkdown,
  summarizeJunitFiles,
  validateResults,
};
