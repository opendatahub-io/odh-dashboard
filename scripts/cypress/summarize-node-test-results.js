'use strict';

const fs = require('node:fs');

const {
  parseNodeTestTapTotals,
  renderNodeTestSummary,
  validateNodeTestTapTotals,
} = require('./lib/node-test-results');

const main = () => {
  const [tapFile] = process.argv.slice(2);
  if (!tapFile) {
    console.error('Usage: node scripts/cypress/summarize-node-test-results.js <tap-file>');
    process.exitCode = 2;
    return;
  }

  try {
    const totals = parseNodeTestTapTotals(fs.readFileSync(tapFile, 'utf8'));
    const validationError = validateNodeTestTapTotals(totals);
    if (validationError) {
      console.error(validationError);
      process.exitCode = 1;
      return;
    }
    console.log(renderNodeTestSummary(totals));
  } catch (error) {
    console.error(`Unable to read Node test results: ${error.message}`);
    process.exitCode = 1;
  }
};

main();
