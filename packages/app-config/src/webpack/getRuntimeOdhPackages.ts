const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

export type WorkspacePackageInfo = {
  name: string;
  dependencies?: Record<string, string>;
  exports?: Record<string, unknown>;
  'module-federation'?: unknown;
};

export type RuntimeOdhPackages = {
  /** All ODH packages to declare as shared singletons (host + remotes). */
  all: Set<string>;
  /**
   * Subset the host can provide (host dep graph + packages with `./extensions`).
   * Remotes should use `import: false` only for these.
   */
  hostProvided: Set<string>;
};

const findMonorepoRoot = (): string => {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
      if (pkg.workspaces) {
        return dir;
      }
    } catch {
      // no package.json here, keep walking up
    }
    dir = path.dirname(dir);
  }
  throw new Error(
    `Could not locate monorepo root from ${process.cwd()}. ` +
      'Ensure webpack is invoked from a directory within the monorepo.',
  );
};

const getWorkspacePackages = (root: string): WorkspacePackageInfo[] => {
  try {
    const stdout = execFileSync('npm', ['query', '.workspace', '--json'], {
      encoding: 'utf8',
      cwd: root,
    });
    const packages: WorkspacePackageInfo[] = JSON.parse(stdout);
    if (packages.length === 0) {
      throw new Error(
        `npm query .workspace returned no packages (cwd: ${root}). ` +
          'Ensure npm install has been run and the workspace is properly configured.',
      );
    }
    return packages;
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('npm query .workspace returned no packages')) {
      throw e;
    }
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to query workspace packages (cwd: ${root}): ${message}`);
  }
};

const collectOdhClosure = (
  seeds: string[],
  byName: Map<string, WorkspacePackageInfo>,
): Set<string> => {
  const visited = new Set<string>();
  const queue = [...seeds];
  while (queue.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const name = queue.shift()!;
    if (visited.has(name)) continue;
    visited.add(name);
    const pkg = byName.get(name);
    if (!pkg) continue;
    for (const dep of Object.keys(pkg.dependencies ?? {})) {
      if (dep.startsWith('@odh-dashboard/') && !visited.has(dep)) {
        queue.push(dep);
      }
    }
  }
  return visited;
};

/**
 * Collect @odh-dashboard/* packages for Module Federation sharing.
 *
 * - **hostProvided**: host direct/transitive deps + packages that export
 *   `./extensions` (built into the host via the virtual plugin-extensions module).
 *   Remotes may safely use `import: false` for these.
 * - **all**: hostProvided plus federated (`module-federation`) packages and their
 *   transitive deps. Federated-only entries stay shareable as singletons but must
 *   allow import/fallback on remotes.
 *
 * Only follows `dependencies` (not devDependencies).
 * Must run from monorepo root so workspace scope is correct.
 */
const getRuntimeOdhPackages = (packages?: WorkspacePackageInfo[]): RuntimeOdhPackages => {
  const root = findMonorepoRoot();
  const pkgs = packages ?? getWorkspacePackages(root);
  const byName = new Map(pkgs.map((p) => [p.name, p]));
  const hostPkg = byName.get('odh-dashboard-frontend');
  const hostDeps = Object.keys(hostPkg?.dependencies ?? {}).filter((n) =>
    n.startsWith('@odh-dashboard/'),
  );
  const extensionPackages = pkgs
    .filter((p) => p.exports?.['./extensions'] != null)
    .map((p) => p.name);
  const federatedPackages = pkgs.filter((p) => p['module-federation']).map((p) => p.name);

  const hostProvided = collectOdhClosure([...hostDeps, ...extensionPackages], byName);
  const all = collectOdhClosure([...hostProvided, ...federatedPackages], byName);

  return { all, hostProvided };
};

module.exports = {
  getRuntimeOdhPackages,
};
