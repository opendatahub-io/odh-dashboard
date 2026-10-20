'use strict';

const fs = require('fs');
const path = require('path');

const {
  renderResultsMarkdown,
  summarizeJunitFiles,
  validateResults,
} = require('./lib/e2e-results');

const parseArgs = (args) => {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(`Expected --name value arguments, received: ${args.join(' ')}`);
    }
    options[key.slice(2)] = value;
  }
  return options;
};

const findXmlFiles = (directory) => {
  const files = [];
  const visit = (currentPath) => {
    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
      } else if (entry.isFile() && entry.name.endsWith('.xml')) {
        files.push(entryPath);
      }
    }
  };
  visit(directory);
  return files.toSorted();
};

const findJunitReports = (directory) => {
  const xmlFiles = findXmlFiles(directory);
  const mergedReports = xmlFiles.filter((file) => path.basename(file) === 'junit-report.xml');
  return mergedReports.length > 0 ? mergedReports : xmlFiles;
};

const writeFile = (file, contents) => {
  if (!file) {
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
};

const main = () => {
  const options = parseArgs(process.argv.slice(2));
  const resultsDir = options['results-dir'];
  if (!resultsDir || !fs.existsSync(resultsDir)) {
    throw new Error('A valid --results-dir is required');
  }

  const files = findJunitReports(resultsDir);
  if (files.length === 0) {
    throw new Error('No JUnit XML files were found');
  }

  const totals = summarizeJunitFiles(files);
  const error = validateResults(totals);
  writeFile(options['summary-json'], `${JSON.stringify(totals, null, 2)}\n`);
  writeFile(options['summary-md'], `${renderResultsMarkdown(totals)}\n`);
  console.log(
    `Cypress E2E results: executed=${totals.executed}, failed=${totals.failures}, skipped=${totals.skipped}, total=${totals.tests}`,
  );
  if (error) {
    throw new Error(error);
  }
};

if (require.main === module) {
  main();
}

module.exports = { findJunitReports, findXmlFiles, parseArgs };
