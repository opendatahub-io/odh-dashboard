/**
 * Emit workspace package metadata as JSON in the shape expected by workspace callers.
 * Used by webpack, module federation, Cypress discovery, and validation scripts.
 *
 * Reads pnpm-workspace.yaml directly so callers do not require `pnpm install`.
 */
const fs = require('fs');
const path = require('path');

function findRepoRoot(start) {
  let dir = start;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  throw new Error(`Could not find pnpm-workspace.yaml from ${start}`);
}

function parseWorkspacePatterns(root) {
  const content = fs.readFileSync(path.join(root, 'pnpm-workspace.yaml'), 'utf8');
  const patterns = [];
  let inPackages = false;

  for (const line of content.split('\n')) {
    if (/^packages:\s*$/.test(line)) {
      inPackages = true;
      continue;
    }
    if (!inPackages) {
      continue;
    }

    const match = line.match(/^ {2}- (.+)$/);
    if (match) {
      patterns.push(match[1].trim());
      continue;
    }

    if (/^\S/.test(line) && !/^#/.test(line)) {
      break;
    }
  }

  return patterns;
}

function expandPattern(root, pattern) {
  if (pattern.includes('**')) {
    throw new Error(
      `Unsupported workspace glob "${pattern}": ** patterns are not supported by query-workspace-packages.js`,
    );
  }

  if (!pattern.includes('*')) {
    return [path.join(root, pattern)];
  }

  const starIndex = pattern.indexOf('*');
  const base = pattern.slice(0, starIndex);
  const suffix = pattern.slice(starIndex + 1);
  const baseDir = path.join(root, base);

  if (!fs.existsSync(baseDir)) {
    return [];
  }

  return fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(baseDir, entry.name, suffix));
}

function listWorkspacePackagesFromManifest(root) {
  const packageDirs = new Set([root]);

  for (const pattern of parseWorkspacePatterns(root)) {
    for (const packageDir of expandPattern(root, pattern)) {
      if (fs.existsSync(path.join(packageDir, 'package.json'))) {
        packageDirs.add(packageDir);
      }
    }
  }

  return [...packageDirs].toSorted().map((absPath) => {
    const pkg = JSON.parse(fs.readFileSync(path.join(absPath, 'package.json'), 'utf8'));
    const relativePath = path.relative(root, absPath) || '.';
    // `path` and `location` are repo-relative for compatibility with existing callers.
    // Callers that need absolute paths (e.g. rspack chunk grouping) must resolve from repo root.
    return { ...pkg, name: pkg.name, path: relativePath, location: relativePath };
  });
}

module.exports = { expandPattern, listWorkspacePackagesFromManifest, parseWorkspacePatterns };

if (require.main === module) {
  const root = findRepoRoot(path.dirname(__filename));
  const packages = listWorkspacePackagesFromManifest(root);

  process.stdout.write(JSON.stringify(packages));
}
