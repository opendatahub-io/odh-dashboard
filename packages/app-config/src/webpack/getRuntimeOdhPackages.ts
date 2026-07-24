import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export type WorkspacePackageInfo = {
  name: string;
  dependencies?: Record<string, string>;
  'module-federation'?: unknown;
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
    const stdout = execSync('npm query .workspace --json', {
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

/**
 * Collect the transitive closure of @odh-dashboard/* runtime dependencies
 * starting from federated remotes and the host's own dependencies.
 * Only follows `dependencies` (not devDependencies).
 *
 * Must run from monorepo root so workspace scope is correct.
 */
export const getRuntimeOdhPackages = (packages?: WorkspacePackageInfo[]): Set<string> => {
  const root = findMonorepoRoot();
  const pkgs = packages ?? getWorkspacePackages(root);
  const byName = new Map(pkgs.map((p) => [p.name, p]));
  const hostPkg = byName.get('odh-dashboard-frontend');
  const hostDeps = Object.keys(hostPkg?.dependencies ?? {});
  const seeds = [
    ...hostDeps.filter((n) => n.startsWith('@odh-dashboard/')),
    ...pkgs.filter((p) => p['module-federation']).map((p) => p.name),
  ];

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
