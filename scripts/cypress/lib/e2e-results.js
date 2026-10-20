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
  const suitePattern = /<testsuite\b[^>]*>/g;
  let match = suitePattern.exec(xml);
  while (match !== null) {
    const attributes = parseJunitAttributes(match[0]);
    totals.tests += Number(attributes.tests ?? 0);
    totals.failures += Number(attributes.failures ?? 0) + Number(attributes.errors ?? 0);
    totals.skipped += Number(attributes.skipped ?? 0);
    match = suitePattern.exec(xml);
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

const validateResults = (totals) => {
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
    '',
  ].join('\n');

module.exports = {
  parseJunitAttributes,
  parseJunitXml,
  renderResultsMarkdown,
  summarizeJunitFiles,
  validateResults,
};
