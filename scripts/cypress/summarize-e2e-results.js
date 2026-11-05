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

const findJunitReportsByJob = (directory) => {
  const groupedFiles = new Map();
  for (const file of findXmlFiles(directory)) {
    const segments = file.split(path.sep);
    const resultsIndex = segments.findLastIndex(
      (segment, index) => segment === 'results' && index < segments.length - 2,
    );
    const jobDir = resultsIndex === -1 ? undefined : segments[resultsIndex + 1];
    if (!jobDir) {
      continue;
    }
    groupedFiles.set(jobDir, [...(groupedFiles.get(jobDir) ?? []), file]);
  }

  const reportsByJob = {};
  for (const [jobDir, files] of groupedFiles) {
    const mergedReports = files.filter((file) => path.basename(file) === 'junit-report.xml');
    reportsByJob[jobDir] = mergedReports.length > 0 ? mergedReports : files;
  }
  return reportsByJob;
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

  const matrixOption = options['matrix-json'];
  const matrixJobs = matrixOption ? JSON.parse(matrixOption) : null;
  if (matrixJobs && (!Array.isArray(matrixJobs) || matrixJobs.some((job) => !job.tag_dir))) {
    throw new Error('A valid --matrix-json is required');
  }

  const jobResults = [];
  const errors = [];
  if (matrixJobs) {
    const reportsByJob = findJunitReportsByJob(resultsDir);
    const expectedJobDirs = new Set(matrixJobs.map((job) => job.tag_dir));
    const unexpectedJobDirs = Object.keys(reportsByJob).filter(
      (jobDir) => !expectedJobDirs.has(jobDir),
    );
    if (unexpectedJobDirs.length > 0) {
      errors.push(`Unexpected E2E result job(s): ${unexpectedJobDirs.toSorted().join(', ')}`);
    }

    for (const job of matrixJobs) {
      const tagDir = job.tag_dir;
      const plannedTestCount = job.planned_test_count;
      const jobFiles = reportsByJob[tagDir] ?? [];
      const jobTotals = summarizeJunitFiles(jobFiles);
      const jobResult = {
        tagDir,
        plannedTestCount,
        ...jobTotals,
        executed: jobTotals.tests - jobTotals.skipped,
      };
      jobResults.push(jobResult);
      if (jobFiles.length === 0) {
        errors.push(`No JUnit XML files were found for job ${tagDir}`);
      } else {
        const jobError = validateResults(jobTotals, plannedTestCount);
        if (jobError) {
          errors.push(`${tagDir}: ${jobError}`);
        }
      }
    }
  } else {
    jobResults.push({
      tagDir: 'all',
      plannedTestCount: undefined,
      ...summarizeJunitFiles(files),
    });
    jobResults[0].executed = jobResults[0].tests - jobResults[0].skipped;
  }

  const totals = jobResults.reduce(
    (aggregate, job) => ({
      tests: aggregate.tests + job.tests,
      failures: aggregate.failures + job.failures,
      skipped: aggregate.skipped + job.skipped,
      executed: aggregate.executed + job.executed,
    }),
    { tests: 0, failures: 0, skipped: 0, executed: 0 },
  );
  const aggregateError = validateResults(totals);
  if (errors.length === 0 && aggregateError) {
    errors.push(aggregateError);
  }

  const summary = { ...totals, jobs: jobResults };
  writeFile(options['summary-json'], `${JSON.stringify(summary, null, 2)}\n`);
  writeFile(options['summary-md'], `${renderResultsMarkdown(summary)}\n`);
  console.log(
    `Cypress E2E results: executed=${totals.executed}, failed=${totals.failures}, skipped=${totals.skipped}, total=${totals.tests}`,
  );
  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
};

if (require.main === module) {
  main();
}

module.exports = { findJunitReports, findJunitReportsByJob, findXmlFiles, parseArgs };
