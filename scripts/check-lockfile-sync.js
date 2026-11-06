#!/usr/bin/env node
/**
 * Lockfile sync check: verify that runtime-shared packages resolve to a single
 * version across all workspace importers. Catches the monaco-editor class of
 * bug where a dependency bump updates some workspaces but not others, leaving
 * multiple resolved versions where module federation shares them at runtime.
 *
 * Usage: node scripts/check-lockfile-sync.js [--quiet]
 * Exit 0 = all synced, exit 1 = mismatches found.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Packages that MUST be single-version because they are shared at runtime
// via module federation singletons or window globals. Add to this list when
// a new runtime-shared dependency is introduced.
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
  const content = fs.readFileSync(lockfilePath, 'utf8');
  const importers = {};
  let currentImporter = null;
  let inDependencies = false;

  for (const line of content.split('\n')) {
    // Importer sections start with 2-space-indented paths
    const importerMatch = line.match(/^  (\S+):$/);
    if (importerMatch) {
      currentImporter = importerMatch[1];
      importers[currentImporter] = {};
      inDependencies = false;
      continue;
    }

    // Dependencies section within an importer
    if (currentImporter && line.match(/^    dependencies:$/)) {
      inDependencies = true;
      continue;
    }
    if (currentImporter && line.match(/^    devDependencies:$/)) {
      inDependencies = false;
      continue;
    }
    // End of importer section (next 2-space indent)
    if (line.match(/^  \S/) || line.match(/^\S/)) {
      currentImporter = null;
      inDependencies = false;
      continue;
    }

    // Parse dependency entries
    if (currentImporter && inDependencies) {
      const depMatch = line.match(/^      (\S+):$/);
      if (depMatch) {
        const pkgName = depMatch[1];
        // Next line has the version
        const nextLines = content
          .substring(content.indexOf(line) + line.length)
          .split('\n');
        const versionMatch = nextLines[0]?.match(/^        version: (.+)$/);
        if (versionMatch) {
          importers[currentImporter][pkgName] = versionMatch[1].trim();
        }
      }
    }
  }

  return importers;
}

function main() {
  const lockfilePath = path.join(ROOT, 'pnpm-lock.yaml');
  if (!fs.existsSync(lockfilePath)) {
    console.error('pnpm-lock.yaml not found');
    process.exit(1);
  }

  const importers = parseLockfileImporters(lockfilePath);
  const failures = [];

  for (const pkg of CRITICAL_PACKAGES) {
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

  if (failures.length > 0) {
    console.error('LOCKFILE SYNC FAILURES:');
    console.error(
      'The following runtime-shared packages resolve to multiple versions across workspaces.',
    );
    console.error(
      'This causes runtime conflicts (e.g., whichever federated module loads last wins for window globals).',
    );
    console.error('');
    for (const { pkg, versions } of failures) {
      console.error(`  ${pkg}:`);
      for (const [version, workspaces] of Object.entries(versions)) {
        const shown = workspaces.slice(0, 3).join(', ');
        const ellipsis = workspaces.length > 3 ? '...' : '';
        console.error(`    ${version.padEnd(20)} -> ${shown}${ellipsis}`);
      }
    }
    console.error('');
    console.error('Fix: align the version range in each workspace package.json, then run pnpm install.');
    process.exit(1);
  } else {
    console.log(
      `Lockfile sync check passed: ${CRITICAL_PACKAGES.length} runtime-shared packages, all single-version.`,
    );
    process.exit(0);
  }
}

main();
