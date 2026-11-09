#!/usr/bin/env node
/**
 * Lockfile sync check: verify that runtime-shared packages resolve to a single
 * version across all workspace importers. Catches the monaco-editor class of
 * bug where a dependency bump updates some workspaces but not others.
 *
 * Usage: node scripts/check-lockfile-sync.js [lockfile-path]
 * Exit 0 = all synced, exit 1 = mismatches found.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Packages that MUST be single-version because they are shared at runtime
// via module federation singletons or window globals.
const CRITICAL_PACKAGES = [
  'monaco-editor',
  '@patternfly/patternfly',
  '@patternfly/react-core',
  '@patternfly/react-icons',
  '@patternfly/react-styles',
  '@patternfly/react-table',
  '@patternfly/react-tokens',
  '@patternfly/react-charts',
  '@patternfly/react-topology',
  '@patternfly/react-code-editor',
  'react',
  'react-dom',
];

function parseLockfileImporters(lockfilePath) {
  const lines = fs.readFileSync(lockfilePath, 'utf8').split('\n');
  const importers = {};
  let currentImporter = null;
  let inDependencies = false;
  let lastPackageName = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Importer sections start with 2-space-indented paths (e.g., "  frontend:" or "  packages/foo:")
    const importerMatch = line.match(/^  (\S+):$/);
    if (importerMatch) {
      currentImporter = importerMatch[1];
      importers[currentImporter] = {};
      inDependencies = false;
      lastPackageName = null;
      continue;
    }

    // Dependencies section within an importer
    if (currentImporter && line.match(/^    dependencies:$/)) {
      inDependencies = true;
      lastPackageName = null;
      continue;
    }
    if (currentImporter && line.match(/^    devDependencies:$/)) {
      inDependencies = false;
      lastPackageName = null;
      continue;
    }

    // End of importer section (any line at 2-space or less indent that's not a dep entry)
    if (currentImporter && !inDependencies && line.match(/^  \S/) && !line.match(/^      /)) {
      currentImporter = null;
      lastPackageName = null;
      continue;
    }

    // Package name entry: 6-space indented, may be quoted for scoped packages
    // e.g., "      react:" or "      '@patternfly/react-core':"
    if (currentImporter && inDependencies) {
      const pkgMatch = line.match(/^      '?([^':]+)'?:$/);
      if (pkgMatch) {
        lastPackageName = pkgMatch[1];
        continue;
      }

      // Version line: 8-space indented, follows the specifier line
      // e.g., "        version: 18.3.1"
      if (lastPackageName) {
        const versionMatch = line.match(/^        version: (.+)$/);
        if (versionMatch) {
          importers[currentImporter][lastPackageName] = versionMatch[1].trim();
          lastPackageName = null;
        }
      }
    }
  }

  return importers;
}

function findMismatches(importers, criticalPackages = CRITICAL_PACKAGES) {
  const failures = [];

  for (const pkg of criticalPackages) {
    const resolvedByWorkspace = new Map(); // resolved version -> [workspaces]

    for (const [importerPath, deps] of Object.entries(importers)) {
      if (!(pkg in deps)) continue;
      const resolved = deps[pkg];
      // Strip peer-dependency suffixes like (monaco-editor@0.56.0)(react@18.3.1)
      const cleanVersion = resolved.split('(')[0];
      if (!resolvedByWorkspace.has(cleanVersion)) {
        resolvedByWorkspace.set(cleanVersion, []);
      }
      resolvedByWorkspace.get(cleanVersion).push(importerPath);
    }

    if (resolvedByWorkspace.size > 1) {
      failures.push({ pkg, versions: Object.fromEntries(resolvedByWorkspace) });
    }
  }

  return failures;
}

function formatFailures(failures) {
  const lines = ['LOCKFILE SYNC FAILURES:'];
  lines.push(
    'The following runtime-shared packages resolve to multiple versions across workspaces.',
  );
  lines.push(
    'This causes runtime conflicts (e.g., whichever federated module loads last wins for window globals).',
  );
  lines.push('');
  for (const { pkg, versions } of failures) {
    lines.push(`  ${pkg}:`);
    for (const [version, workspaces] of Object.entries(versions)) {
      const shown = workspaces.slice(0, 3).join(', ');
      const ellipsis = workspaces.length > 3 ? '...' : '';
      lines.push(`    ${version.padEnd(20)} -> ${shown}${ellipsis}`);
    }
  }
  lines.push('');
  lines.push('Fix: align the version range in each workspace package.json, then run pnpm install.');
  return lines.join('\n');
}

function main() {
  const lockfilePath = process.argv[2] || path.join(ROOT, 'pnpm-lock.yaml');
  if (!fs.existsSync(lockfilePath)) {
    console.error('pnpm-lock.yaml not found');
    process.exit(1);
  }

  const importers = parseLockfileImporters(lockfilePath);
  const failures = findMismatches(importers);

  if (failures.length > 0) {
    console.error(formatFailures(failures));
    process.exit(1);
  } else {
    console.log(
      `Lockfile sync check passed: ${CRITICAL_PACKAGES.length} runtime-shared packages, all single-version.`,
    );
    process.exit(0);
  }
}

module.exports = { parseLockfileImporters, findMismatches, formatFailures, CRITICAL_PACKAGES };

if (require.main === module) {
  main();
}
