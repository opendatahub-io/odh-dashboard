/**
 * Generate Cypress test matrix for CI
 *
 * Automatically splits test directories based on file size:
 * - Files > 15KB get individual test groups
 * - Smaller files are grouped together
 * - New test files are automatically picked up and will use the existing build mechanism
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const TESTS_DIR = 'packages/cypress/cypress/tests/mocked';
const SIZE_THRESHOLD = 15 * 1024; // 15KB - files larger than this get split into individual groups
const GROUP_SIZE_THRESHOLD = 40 * 1024; // 40KB - grouped shards larger than this get split into balanced sub-groups

/**
 * Validate that a string is safe for use in shell contexts
 * Only allows alphanumeric, dash, underscore, slash, dot, comma, curly braces
 * Rejects path traversal, shell metacharacters, and injection patterns
 */
function validateSafePath(input, fieldName) {
  if (typeof input !== 'string' || input.length === 0) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }

  // Reject path traversal attempts
  if (input.includes('..') || input.includes('//')) {
    throw new Error(`${fieldName} contains path traversal: ${input}`);
  }

  // Reject shell metacharacters and injection patterns
  // Allow: alphanumeric, dash, underscore, slash, dot, comma, curly braces, asterisk (for glob patterns)
  const safePattern = /^[a-zA-Z0-9\-_/.,{}*]+$/;
  if (!safePattern.test(input)) {
    throw new Error(
      `${fieldName} contains unsafe characters (only a-zA-Z0-9-_/.,{}* allowed): ${input}`,
    );
  }

  // Reject if it starts with slash (absolute paths)
  if (input.startsWith('/')) {
    throw new Error(`${fieldName} must be a relative path: ${input}`);
  }

  return input;
}

/**
 * Recursively find all directories containing .cy.ts files
 */
function getTestDirectories(baseDir = TESTS_DIR, relativePath = '') {
  if (!fs.existsSync(baseDir)) {
    console.error(`Error: ${baseDir} not found`);
    return [];
  }

  let directories = [];
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });

  // Check if current directory has test files
  const hasTests = entries.some((entry) => entry.isFile() && entry.name.endsWith('.cy.ts'));

  if (hasTests) {
    directories.push(relativePath || '.');
  }

  // Recursively search subdirectories
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('__')) {
      // Skip __mocks__, __intercept__, etc.
      const subPath = path.join(baseDir, entry.name);
      const subRelative = relativePath ? path.join(relativePath, entry.name) : entry.name;
      directories = directories.concat(getTestDirectories(subPath, subRelative));
    }
  }

  return directories.toSorted();
}

/**
 * Get all .cy.ts files in a directory with their sizes
 */
function getTestFiles(dir) {
  const dirPath = path.join(TESTS_DIR, dir);

  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const entries = fs.readdirSync(dirPath);
  const testFiles = entries
    .filter((file) => file.endsWith('.cy.ts'))
    .map((file) => {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      return {
        name: path.basename(file, '.cy.ts'),
        size: stats.size,
        path: path.join(dir, file),
      };
    })
    .toSorted((a, b) => b.size - a.size); // Largest first

  return testFiles;
}

/**
 * Split an array of files into N balanced bins by total size (greedy largest-first).
 * Returns an array of arrays, each bin containing files with roughly equal total size.
 */
function balancedSplit(files, numBins) {
  const bins = Array.from({ length: numBins }, () => ({ files: [], totalSize: 0 }));

  const sorted = [...files].toSorted((a, b) => b.size - a.size);
  for (const file of sorted) {
    const smallest = bins.reduce((min, bin) => (bin.totalSize < min.totalSize ? bin : min));
    smallest.files.push(file);
    smallest.totalSize += file.size;
  }

  return bins.filter((bin) => bin.files.length > 0);
}

/**
 * Create a grouped shard entry from a list of files
 */
function createGroupedEntry(dir, files, suffix) {
  const fileNames = files.map((f) => f.name).join(',');
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  const spec =
    files.length === 1
      ? `cypress/cypress/tests/mocked/${files[0].path}`
      : `cypress/cypress/tests/mocked/${dir}/{${fileNames}}.cy.ts`;

  return {
    name: `${dir}/${suffix}`,
    spec,
    size: totalSize,
    count: files.length,
    strategy: 'grouped',
  };
}

/**
 * Generate test groups for central mock tests
 */
function generateCentralTestGroups() {
  const directories = getTestDirectories();
  const groups = [];

  for (const dir of directories) {
    const testFiles = getTestFiles(dir);

    if (testFiles.length === 0) {
      continue;
    }

    // Split files by size
    const largeFiles = testFiles.filter((f) => f.size > SIZE_THRESHOLD);
    const smallFiles = testFiles.filter((f) => f.size <= SIZE_THRESHOLD);

    // Large files get individual groups
    for (const file of largeFiles) {
      groups.push({
        name: `${dir}/${file.name}`,
        spec: `cypress/cypress/tests/mocked/${file.path}`,
        size: file.size,
        strategy: 'individual',
      });
    }

    // Small files grouped together, split if total size exceeds threshold
    if (smallFiles.length > 0) {
      const totalSize = smallFiles.reduce((sum, f) => sum + f.size, 0);

      if (totalSize > GROUP_SIZE_THRESHOLD && smallFiles.length >= 2) {
        const numBins = Math.ceil(totalSize / GROUP_SIZE_THRESHOLD);
        const bins = balancedSplit(smallFiles, numBins);

        for (let i = 0; i < bins.length; i++) {
          const suffix = bins.length === 1 ? 'other' : `other-${i + 1}`;
          groups.push(createGroupedEntry(dir, bins[i].files, suffix));
        }
      } else {
        groups.push(createGroupedEntry(dir, smallFiles, 'other'));
      }
    }
  }

  return groups;
}

/**
 * Discover package-based cypress tests using npm query
 */
function generatePackageTestGroups() {
  try {
    const output = execSync("npm query '.workspace' --json", {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'], // Suppress stderr
    });

    const packages = JSON.parse(output);
    const groups = [];

    for (const pkg of packages) {
      // Skip if no cypress config or is the cypress package itself
      if (!pkg.cypress?.mocked || pkg.name === '@odh-dashboard/cypress') {
        continue;
      }

      const pkgName = pkg.name.split('/').pop();
      const testPath = path.join('packages', pkgName);

      // Verify tests actually exist
      if (!fs.existsSync(testPath)) {
        continue;
      }

      // Check for .cy.ts files
      const hasTests = findTestFiles(testPath);

      if (hasTests.length > 0) {
        groups.push({
          name: `pkg-${pkgName}`,
          spec: `${pkgName}/${pkg.cypress.mocked}`,
          strategy: 'package',
        });
      }
    }

    return groups;
  } catch (error) {
    console.error('Warning: Could not discover package tests:', error.message);
    return [];
  }
}

/**
 * Recursively find .cy.ts files in a directory
 */
function findTestFiles(dir) {
  let results = [];

  if (!fs.existsSync(dir)) {
    return results;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results = results.concat(findTestFiles(fullPath));
    } else if (entry.name.endsWith('.cy.ts')) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Main function
 */
function main() {
  console.error('Generating Cypress test matrix...\n');

  // Generate central test groups
  const centralGroups = generateCentralTestGroups();
  console.error(`✓ Found ${centralGroups.length} central test groups`);

  // Generate package test groups
  const packageGroups = generatePackageTestGroups();
  console.error(`✓ Found ${packageGroups.length} package test groups`);

  // Combine all groups
  const allGroups = [...centralGroups, ...packageGroups];

  if (allGroups.length === 0) {
    console.error('Warning: No test groups found, using default');
    allGroups.push({
      name: 'default',
      spec: 'cypress/cypress/tests/mocked/**/*.cy.ts',
    });
  }

  // Log summary
  console.error(`\n📊 Test Matrix Summary:`);
  console.error(`   Total groups: ${allGroups.length}`);

  const individual = allGroups.filter((g) => g.strategy === 'individual');
  const grouped = allGroups.filter((g) => g.strategy === 'grouped');
  const packages = allGroups.filter((g) => g.strategy === 'package');

  if (individual.length > 0) {
    console.error(`   Individual files (>${SIZE_THRESHOLD / 1024}KB): ${individual.length}`);
  }
  if (grouped.length > 0) {
    const totalFiles = grouped.reduce((sum, g) => sum + (g.count || 0), 0);
    console.error(`   Grouped files: ${totalFiles} files in ${grouped.length} groups`);
  }
  if (packages.length > 0) {
    console.error(`   Package tests: ${packages.length}`);
  }

  // Output JSON for GitHub Actions
  // Remove metadata fields (size, count, strategy) from final output
  // Validate all names and specs for shell safety
  const output = allGroups.map(({ name, spec }) => {
    validateSafePath(name, 'test group name');
    validateSafePath(spec, 'test group spec');
    return { name, spec };
  });
  console.log(JSON.stringify(output));
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { generateCentralTestGroups, generatePackageTestGroups };
