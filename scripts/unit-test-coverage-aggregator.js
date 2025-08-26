#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

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

// Function to match a file path against a glob pattern
function matchesGlobPattern(filePath, pattern, packagePath) {
  // Convert file path to relative path from package root
  const relativePath = path.relative(packagePath, filePath).replace(/\\/g, '/');

  // Clean up the pattern - remove any trailing commas and normalize slashes
  let cleanPattern = pattern.trim().replace(/,$/, '').replace(/\\/g, '/');

  // Convert glob pattern to regex
  let regexPattern = '';
  let i = 0;

  while (i < cleanPattern.length) {
    const char = cleanPattern[i];

    if (char === '*') {
      if (i + 1 < cleanPattern.length && cleanPattern[i + 1] === '*') {
        // Handle ** - matches any number of directories
        regexPattern += '.*';
        i += 2;
        // Skip optional trailing slash
        if (i < cleanPattern.length && cleanPattern[i] === '/') {
          i++;
        }
      } else {
        // Handle * - matches anything except path separators
        regexPattern += '[^/]*';
        i++;
      }
    } else if (char === '{') {
      // Handle {ts,tsx} syntax
      const closeIndex = cleanPattern.indexOf('}', i);
      if (closeIndex !== -1) {
        const options = cleanPattern.substring(i + 1, closeIndex);
        regexPattern += `(${options.split(',').join('|')})`;
        i = closeIndex + 1;
      } else {
        // Escape as literal if no closing brace
        regexPattern += '\\{';
        i++;
      }
    } else if (/[.+?^$()|[\]\\]/.test(char)) {
      // Escape special regex characters
      regexPattern += `\\${char}`;
      i++;
    } else {
      regexPattern += char;
      i++;
    }
  }

  // Anchor the pattern
  regexPattern = `^${regexPattern}$`;

  try {
    const regex = new RegExp(regexPattern);
    return regex.test(relativePath);
  } catch (error) {
    console.warn(`Error matching pattern ${pattern} against ${relativePath}: ${error.message}`);
    return false;
  }
}

// Function to check if a file should be excluded
function isFileExcluded(filePath, exclusionPatterns, packagePath) {
  return exclusionPatterns.some((pattern) => matchesGlobPattern(filePath, pattern, packagePath));
}

// Function to recursively find all TypeScript files
function findAllTsFiles(dir) {
  const files = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...findAllTsFiles(fullPath));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (['.ts', '.tsx'].includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.warn(`Error reading directory ${dir}: ${error.message}`);
  }

  return files;
}

// Function to find source files in a package that match collectCoverageFrom patterns
function findSourceFiles(packagePath, inclusionPatterns, exclusionPatterns) {
  const sourceFiles = [];

  // First, find all TypeScript files in the package
  const allTsFiles = findAllTsFiles(packagePath);

  // Then filter based on inclusion and exclusion patterns
  for (const filePath of allTsFiles) {
    // Check if file matches any inclusion pattern
    const matchesInclusion = inclusionPatterns.some((pattern) =>
      matchesGlobPattern(filePath, pattern, packagePath),
    );

    if (matchesInclusion) {
      // Check if file should be excluded
      const shouldExclude = isFileExcluded(filePath, exclusionPatterns, packagePath);

      if (!shouldExclude) {
        sourceFiles.push(filePath);
      }
    }
  }

  // Remove duplicates manually
  const uniqueFiles = [];
  for (const file of sourceFiles) {
    if (!uniqueFiles.includes(file)) {
      uniqueFiles.push(file);
    }
  }

  return uniqueFiles;
}

// Function to create empty coverage record for a file
function createEmptyCoverageRecord(filePath) {
  // Read the file to analyze its structure
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Create a simple coverage record with 0 coverage
    // This is a simplified approach - in reality, you'd need to parse the AST
    // to get accurate statement/branch/function counts
    const coverage = {
      path: filePath,
      statementMap: {},
      fnMap: {},
      branchMap: {},
      s: {},
      f: {},
      b: {},
    };

    // Create line coverage - assume each non-empty line is a statement
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      if (line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('/*')) {
        coverage.statementMap[lineNumber] = {
          start: { line: lineNumber, column: 0 },
          end: { line: lineNumber, column: line.length },
        };
        coverage.s[lineNumber] = 0;
      }
    });

    return coverage;
  } catch (error) {
    console.warn(`Error creating coverage record for ${filePath}: ${error.message}`);
    return null;
  }
}

// Function to create empty coverage files for packages without tests
function createEmptyCoverageForPackages(
  packagesWithoutCoverage,
  inclusionPatterns,
  exclusionPatterns,
) {
  const emptyCoverageFiles = [];

  for (const packagePath of packagesWithoutCoverage) {
    console.log(`Creating empty coverage for package: ${packagePath}`);

    const sourceFiles = findSourceFiles(packagePath, inclusionPatterns, exclusionPatterns);
    if (sourceFiles.length === 0) {
      console.log(`  No source files found matching patterns in ${packagePath}`);
      continue;
    }

    console.log(`  Found ${sourceFiles.length} source files in ${packagePath}`);

    // Create coverage object for this package
    const packageCoverage = {};

    for (const sourceFile of sourceFiles) {
      const coverage = createEmptyCoverageRecord(sourceFile);
      if (coverage) {
        packageCoverage[sourceFile] = coverage;
      }
    }

    if (Object.keys(packageCoverage).length > 0) {
      // Write coverage file to a temporary location
      const tempCoverageFile = path.join(packagePath, 'empty-coverage.json');
      fs.writeFileSync(tempCoverageFile, JSON.stringify(packageCoverage, null, 2));
      emptyCoverageFiles.push(tempCoverageFile);
      console.log(`  Created empty coverage file: ${tempCoverageFile}`);
    }
  }

  return emptyCoverageFiles;
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

// Get collectCoverageFrom patterns from the Jest config
function getCoveragePatterns() {
  // Try to read and parse the Jest config file directly
  const jestConfigPath = path.join(process.cwd(), 'packages/jest-config/jest.config.ts');

  try {
    const configContent = fs.readFileSync(jestConfigPath, 'utf8');

    // Extract collectCoverageFrom array using regex
    const collectCoverageFromMatch = configContent.match(/collectCoverageFrom:\s*\[([\s\S]*?)\]/);

    if (!collectCoverageFromMatch) {
      console.warn('Could not find collectCoverageFrom in jest config, using default patterns');
      return {
        inclusion: [
          'src/**/*.{ts,tsx}',
          'extensions.ts',
          'extensions/**/*.{ts,tsx}',
          'extension-points.ts',
          'extension-points/**/*.{ts,tsx}',
        ],
        exclusion: [
          '**/__tests__/**',
          '**/__mocks__/**',
          '**/*.spec.{ts,tsx}',
          'upstream/**',
          'src/third_party/**',
        ],
      };
    }

    // Parse patterns from the matched content
    const patternsText = collectCoverageFromMatch[1];
    const patterns = [];
    const patternRegex = /['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = patternRegex.exec(patternsText)) !== null) {
      patterns.push(match[1]);
    }

    // Separate inclusion and exclusion patterns
    const inclusion = patterns.filter((pattern) => !pattern.startsWith('!'));
    const exclusion = patterns
      .filter((pattern) => pattern.startsWith('!'))
      .map((pattern) => pattern.slice(1));

    console.log(
      `Extracted ${inclusion.length} inclusion and ${exclusion.length} exclusion patterns from jest config`,
    );
    return { inclusion, exclusion };
  } catch (error) {
    console.warn(`Error reading jest config: ${error.message}, using default patterns`);
    return {
      inclusion: [
        'src/**/*.{ts,tsx}',
        'extensions.ts',
        'extensions/**/*.{ts,tsx}',
        'extension-points.ts',
        'extension-points/**/*.{ts,tsx}',
      ],
      exclusion: [
        '**/__tests__/**',
        '**/__mocks__/**',
        '**/*.spec.{ts,tsx}',
        'upstream/**',
        'src/third_party/**',
      ],
    };
  }
}

const coveragePatterns = getCoveragePatterns();
const inclusionPatterns = coveragePatterns.inclusion;
const exclusionPatterns = coveragePatterns.exclusion;

// Find packages with jest-coverage directories containing coverage files
const packagesWithCoverage = [];
const packagesWithoutCoverage = [];

for (const packagePath of packagePaths) {
  const coverageDir = path.join(packagePath, 'jest-coverage');
  if (fs.existsSync(coverageDir)) {
    // Package has jest-coverage directory - check if it contains coverage files
    const coverageFiles = fs
      .readdirSync(coverageDir)
      .filter((file) => file.endsWith('.json') || file === 'coverage-final.json');

    if (coverageFiles.length > 0) {
      packagesWithCoverage.push(packagePath);
      console.log(`Found coverage in: ${packagePath}`);
    }
    // Note: If jest-coverage exists but is empty, we don't add to packagesWithoutCoverage
    // because the user specifically requested only packages WITHOUT jest-coverage folder
  } else {
    // Only add to packagesWithoutCoverage if jest-coverage directory doesn't exist at all
    // Exclude frontend/ folder since nested packages will handle their own coverage
    const isFrontendRoot =
      path.basename(packagePath) === 'frontend' && packagePath.endsWith('/frontend');

    if (!isFrontendRoot) {
      packagesWithoutCoverage.push(packagePath);
    }
  }
}

// Create empty coverage for packages without tests but with source files
console.log(`Found ${packagesWithoutCoverage.length} packages without coverage`);
console.log(
  `Using ${inclusionPatterns.length} inclusion patterns and ${exclusionPatterns.length} exclusion patterns`,
);
const emptyCoverageFiles = createEmptyCoverageForPackages(
  packagesWithoutCoverage,
  inclusionPatterns,
  exclusionPatterns,
);

if (packagesWithCoverage.length === 0 && emptyCoverageFiles.length === 0) {
  console.log('No packages with coverage or source files found');
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
    console.log(`${colors.green}Found coverage file: ${coverageFinalPath}${colors.reset}`);
  }
}

// Add empty coverage files
for (const emptyCoverageFile of emptyCoverageFiles) {
  coverageFiles.push(emptyCoverageFile);
  console.log(`${colors.yellow}Including empty coverage file: ${emptyCoverageFile}${colors.reset}`);
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

// Clean up empty coverage files
for (const emptyCoverageFile of emptyCoverageFiles) {
  try {
    if (fs.existsSync(emptyCoverageFile)) {
      fs.unlinkSync(emptyCoverageFile);
      console.log(`Cleaned up empty coverage file: ${emptyCoverageFile}`);
    }
  } catch (error) {
    console.warn(`Failed to clean up empty coverage file ${emptyCoverageFile}: ${error.message}`);
  }
}

console.log(`${colors.green}\nCoverage aggregation complete!${colors.reset}`);
console.log(`Reports available in: ${rootCoverageDir}`);
console.log(`- HTML report: ${rootCoverageDir}/html/index.html`);
console.log(`- LCOV report: ${rootCoverageDir}/lcov.info`);
console.log(`- JSON summary: ${rootCoverageDir}/coverage-summary.json`);
