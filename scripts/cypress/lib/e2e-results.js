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
  if (
    plannedTestCount !== undefined &&
    plannedTestCount !== null &&
    totals.executed !== plannedTestCount
  ) {
    return `Expected ${plannedTestCount} executed Cypress test(s), but found ${totals.executed}`;
  }
  if (totals.tests === 0) {
    return 'No Cypress tests executed';
  }
  if (totals.failures > 0) {
    return `${totals.failures} Cypress test(s) failed`;
  }
  if (totals.skipped === totals.tests) {
    return 'Every selected Cypress test was skipped';
  }
  return null;
};

const renderResultsMarkdown = (totals) =>
  [
    '# Cypress E2E results summary',
    '',
    `- Executed: ${totals.executed}`,
    `- Failed: ${totals.failures}`,
    `- Skipped: ${totals.skipped}`,
    `- Total: ${totals.tests}`,
    ...(totals.jobs
      ? [
          '',
          '## Jobs',
          ...totals.jobs.map(
            (job) =>
              `- ${job.tagDir}: executed=${job.executed}, failed=${job.failures}, skipped=${
                job.skipped
              }, total=${job.tests}, expected=${job.plannedTestCount ?? 'unknown'}`,
          ),
        ]
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
