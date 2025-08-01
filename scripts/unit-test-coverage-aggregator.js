#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Function to execute shell commands
function execCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    return null;
  }
}

// Function to safely execute shell commands that might fail
function execCommandSafe(command) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch (error) {
    return null;
  }
}

// Get all workspace packages
console.log('Finding workspace packages...');
const workspacePackagesResult = execCommandSafe('npm query .workspace --json');
if (!workspacePackagesResult) {
  console.error('Failed to get workspace packages. Make sure npm workspace is configured.');
  process.exit(1);
}

// Parse the JSON output and extract paths
let packagePaths = [];
try {
  const workspacePackages = JSON.parse(workspacePackagesResult);
  packagePaths = workspacePackages.map((pkg) => pkg.path).filter((path) => path && path.length > 0);
} catch (error) {
  console.error('Failed to parse workspace packages JSON:', error.message);
  process.exit(1);
}

console.log(`Found ${packagePaths.length} workspace packages`);

// Find packages with jest-coverage directories containing coverage files
const packagesWithCoverage = [];
for (const packagePath of packagePaths) {
  const coverageDir = path.join(packagePath, 'jest-coverage');
  if (fs.existsSync(coverageDir)) {
    // Check if there are any coverage files in the directory
    const coverageFiles = fs
      .readdirSync(coverageDir)
      .filter((file) => file.endsWith('.json') || file === 'coverage-final.json');

    if (coverageFiles.length > 0) {
      packagesWithCoverage.push(packagePath);
      console.log(`Found coverage in: ${packagePath}`);
    }
  }
}

if (packagesWithCoverage.length === 0) {
  console.log('No packages with jest-coverage directories found');
  process.exit(0);
}

// Create root coverage directory
const rootCoverageDir = path.join(process.cwd(), 'jest-coverage');
console.log(`Creating root coverage directory: ${rootCoverageDir}`);

// Clean up existing root coverage directory
if (fs.existsSync(rootCoverageDir)) {
  fs.rmSync(rootCoverageDir, { recursive: true, force: true });
}
fs.mkdirSync(rootCoverageDir, { recursive: true });

// Find all coverage-final.json files
const coverageFiles = [];
for (const packagePath of packagesWithCoverage) {
  const coverageDir = path.join(packagePath, 'jest-coverage');
  const coverageFinalPath = path.join(coverageDir, 'coverage-final.json');

  if (fs.existsSync(coverageFinalPath)) {
    coverageFiles.push(coverageFinalPath);
    console.log(`Found coverage file: ${coverageFinalPath}`);
  }
}

if (coverageFiles.length === 0) {
  console.log('No coverage-final.json files found');
  process.exit(0);
}

// Use nyc to merge coverage reports
console.log('Merging coverage reports...');
const tempCoverageDir = path.join(rootCoverageDir, '.nyc_output');
fs.mkdirSync(tempCoverageDir, { recursive: true });

// Copy coverage files to temp directory for merging
coverageFiles.forEach((file, index) => {
  const tempFile = path.join(tempCoverageDir, `coverage-${index}.json`);
  fs.copyFileSync(file, tempFile);
});

// Merge coverage files
const mergedCoverageFile = path.join(rootCoverageDir, 'coverage-final.json');
const nycMergeCommand = `npx nyc merge ${tempCoverageDir} ${mergedCoverageFile}`;

console.log(`Executing: ${nycMergeCommand}`);
const mergeResult = execCommand(nycMergeCommand);
if (mergeResult === null) {
  console.error('Failed to merge coverage reports');
  process.exit(1);
}

// Generate different types of reports
console.log('Generating coverage reports...');

// Generate HTML report
const htmlReportCommand = `npx nyc report --reporter=html --report-dir=${rootCoverageDir}/html --temp-dir=${tempCoverageDir}`;
console.log(`Executing: ${htmlReportCommand}`);
execCommand(htmlReportCommand);

// Generate lcov report
const lcovReportCommand = `npx nyc report --reporter=lcov --report-dir=${rootCoverageDir} --temp-dir=${tempCoverageDir}`;
console.log(`Executing: ${lcovReportCommand}`);
execCommand(lcovReportCommand);

// Generate text summary
const textReportCommand = `npx nyc report --reporter=text --temp-dir=${tempCoverageDir}`;
console.log(`Executing: ${textReportCommand}`);
execCommand(textReportCommand);

// Generate JSON summary
const jsonReportCommand = `npx nyc report --reporter=json-summary --report-dir=${rootCoverageDir} --temp-dir=${tempCoverageDir}`;
console.log(`Executing: ${jsonReportCommand}`);
execCommand(jsonReportCommand);

// Clean up temp directory
fs.rmSync(tempCoverageDir, { recursive: true, force: true });

console.log(`\nCoverage aggregation complete!`);
console.log(`Reports available in: ${rootCoverageDir}`);
console.log(`- HTML report: ${rootCoverageDir}/html/index.html`);
console.log(`- LCOV report: ${rootCoverageDir}/lcov.info`);
console.log(`- JSON summary: ${rootCoverageDir}/coverage-summary.json`);
