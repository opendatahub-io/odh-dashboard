/**
 * Emit workspace package metadata as JSON in the shape expected by workspace callers.
 * Used by webpack, module federation, Cypress discovery, and validation scripts.
 *
 * pnpm remains the source of truth for workspace pattern expansion. This command works
 * without node_modules, and package.json files are read separately because `pnpm list`
 * only returns basic project metadata.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function findRepoRoot(start) {
  let dir = path.resolve(start);
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  throw new Error(`Could not find pnpm-workspace.yaml from ${start}`);
}

function listWorkspacePackagePaths(root) {
  const stdout = execFileSync('pnpm', ['list', '--recursive', '--depth', '-1', '--json'], {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  const projects = JSON.parse(stdout);

  if (!Array.isArray(projects)) {
    throw new Error('pnpm list returned invalid workspace package data');
  }

  return projects.map((project) => {
    if (!project || typeof project.path !== 'string') {
      throw new Error('pnpm list returned a workspace package without a path');
    }
    return path.isAbsolute(project.path) ? project.path : path.resolve(root, project.path);
  });
}

function listWorkspacePackagesFromManifest(root) {
  const canonicalRoot = fs.realpathSync(root);

  return listWorkspacePackagePaths(root)
    .map((absPath) => {
      const canonicalPath = fs.realpathSync(absPath);
      const packageJsonPath = path.join(canonicalPath, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const relativePath =
        path.relative(canonicalRoot, canonicalPath).split(path.sep).join('/') || '.';
      // `path` and `location` are repo-relative for compatibility with existing callers.
      // Callers that need absolute paths (e.g. rspack chunk grouping) must resolve from repo root.
      return { ...pkg, name: pkg.name, path: relativePath, location: relativePath };
    })
    .toSorted((a, b) => a.path.localeCompare(b.path));
}

module.exports = { findRepoRoot, listWorkspacePackagesFromManifest, listWorkspacePackagePaths };

if (require.main === module) {
  const root = findRepoRoot(path.dirname(__filename));
  const packages = listWorkspacePackagesFromManifest(root);

  process.stdout.write(JSON.stringify(packages));
}
