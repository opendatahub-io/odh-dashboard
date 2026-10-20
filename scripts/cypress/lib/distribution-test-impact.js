const path = require('path');
const { execFileSync } = require('child_process');
const { readChanges } = require('../plan-mock-test-impact');
const { listWorkspacePackagesFromManifest } = require('../../query-workspace-packages');

const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
];
const within = (file, directory) => file === directory || file.startsWith(`${directory}/`);

// These inputs are consumed outside normal workspace imports or control CI execution.
const GLOBAL_INPUTS = new Set([
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'turbo.jsonc',
  '.npmrc',
  '.eslintrc.js',
  '.prettierrc',
  '.github/workflows/test.yml',
  'scripts/query-workspace-packages.js',
]);
const INPUT_DIRECTORIES = ['scripts/cypress', '.github/actions/pnpm-setup'];

const isDocumentation = (file) =>
  (/\.(md|mdx|adoc|rst)$/i.test(file) && (file.includes('/docs/') || !file.includes('/'))) ||
  /(^|\/)(README|CONTRIBUTING|AGENTS|CLAUDE)\.(md|mdx|adoc|rst)$/i.test(file);

function dependencyRoots(packages, target) {
  const byName = new Map(packages.map((pkg) => [pkg.name, pkg]));
  if (byName.size !== packages.length) {
    throw new Error('Ambiguous workspace package names');
  }
  const selected = new Map();
  const visit = (name, chain) => {
    const pkg = byName.get(name);
    if (!pkg) {
      throw new Error(`Workspace dependency not found: ${name}`);
    }
    if (selected.has(pkg.path)) {
      return;
    }
    selected.set(pkg.path, chain);

    // A parent package often builds its nested frontend workspace via a shell script.
    for (const child of packages) {
      if (child.path !== pkg.path && within(child.path, pkg.path)) {
        visit(child.name, [...chain, child.name]);
      }
    }
    for (const field of DEPENDENCY_FIELDS) {
      for (const [dependency, version] of Object.entries(pkg[field] || {})) {
        if (byName.has(dependency)) {
          visit(dependency, [...chain, dependency]);
        } else if (version.startsWith('workspace:')) {
          throw new Error(`Unresolved workspace dependency: ${name} -> ${dependency}`);
        }
      }
    }
  };
  visit(target, [target]);
  return selected;
}

function planDistributionImpact({ target, changes, packages, basePackages = packages }) {
  if (typeof target !== 'string' || !target) {
    throw new Error('A target workspace package is required');
  }
  if (changes.length === 0) {
    return { run: true, reason: 'No usable changes; run distribution tests conservatively.' };
  }
  const runtimeChanges = changes.filter(({ path }) => !isDocumentation(path));
  if (runtimeChanges.length === 0) {
    return { run: false, reason: 'Documentation-only change.' };
  }
  const globalInput = runtimeChanges.find(
    ({ path }) => GLOBAL_INPUTS.has(path) || INPUT_DIRECTORIES.some((dir) => within(path, dir)),
  );
  if (globalInput) {
    return {
      run: true,
      reason: `Distribution build/test infrastructure changed: ${globalInput.path}`,
    };
  }
  const roots = new Map([
    ...dependencyRoots(basePackages, target),
    ...dependencyRoots(packages, target),
  ]);
  for (const { path } of runtimeChanges) {
    for (const [directory, chain] of roots) {
      if (within(path, directory)) {
        return { run: true, reason: `${path} affects ${chain.join(' -> ')}` };
      }
    }
  }
  return { run: false, reason: 'No target dependency or build/test input changed.' };
}

const git = (root, args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });

function readBasePackages(root, base, packages, changes) {
  // Workspace-pattern changes already force a run. Otherwise current workspace roots,
  // plus changed manifests, include packages removed or renamed by this change.
  const manifests = new Set([
    ...packages.map((pkg) => `${pkg.path}/package.json`),
    ...changes
      .filter((change) => change.path.endsWith('/package.json'))
      .map((change) => change.path),
  ]);
  const tracked = new Set(git(root, ['ls-tree', '-r', '--name-only', base]).trim().split('\n'));
  return [...manifests]
    .filter((file) => tracked.has(file))
    .map((file) => ({
      ...JSON.parse(git(root, ['show', `${base}:${file}`])),
      path: path.posix.dirname(file),
    }));
}

function selectDistributionTests(root, options) {
  const { target } = options;
  let plan;
  try {
    const head = options.head || 'HEAD';
    const base = git(root, ['merge-base', options.base || `${head}^`, head]).trim();
    const changes = readChanges(root, base, head);
    const packages = listWorkspacePackagesFromManifest(root).filter((pkg) => pkg.path !== '.');
    const manifestChanged = changes.some((change) => change.path.endsWith('/package.json'));
    const basePackages = manifestChanged
      ? readBasePackages(root, base, packages, changes)
      : packages;
    plan = planDistributionImpact({ target, changes, packages, basePackages });
  } catch (error) {
    plan = {
      run: true,
      reason: `Impact selection failed; run distribution tests: ${error.message}`,
    };
  }
  return plan;
}

module.exports = {
  dependencyRoots,
  planDistributionImpact,
  readBasePackages,
  selectDistributionTests,
};
