const path = require('path');

const { listWorkspacePackagesFromManifest } = require('../../query-workspace-packages');

const FRONTEND_PACKAGE = 'odh-dashboard-frontend';
const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];

const normalizePath = (value) => value.split(path.sep).join('/').replace(/^\.\//, '');

const isInside = (file, directory) => file === directory || file.startsWith(`${directory}/`);

const createWorkspaceTestIndex = ({ packages, groups, frontendPackage = FRONTEND_PACKAGE }) => {
  const errors = [];
  const packagesByName = new Map();
  for (const pkg of packages) {
    if (!pkg.name || !pkg.path) {
      errors.push('Workspace package is missing a name or path.');
      continue;
    }
    if (packagesByName.has(pkg.name)) {
      errors.push(`Duplicate workspace package name: ${pkg.name}`);
      continue;
    }
    packagesByName.set(pkg.name, pkg);
  }

  if (!packagesByName.has(frontendPackage)) {
    errors.push(`Frontend workspace package is missing: ${frontendPackage}`);
  }

  const packageRoots = [...packagesByName.values()]
    .filter((pkg) => pkg.path !== '.')
    .map((pkg) => ({ ...pkg, path: normalizePath(pkg.path) }))
    .toSorted((left, right) => right.path.length - left.path.length);
  const dependencies = new Map([...packagesByName].map(([name]) => [name, new Set()]));

  for (const pkg of packagesByName.values()) {
    for (const field of DEPENDENCY_FIELDS) {
      for (const dependencyName of Object.keys(pkg[field] ?? {})) {
        if (packagesByName.has(dependencyName)) {
          dependencies.get(pkg.name).add(dependencyName);
        } else if (dependencyName.startsWith('@odh-dashboard/')) {
          errors.push(`${pkg.name} references missing workspace dependency ${dependencyName}.`);
        }
      }
    }

    if (pkg.path !== '.') {
      const normalizedPackagePath = normalizePath(pkg.path);
      const parent = packageRoots.find(
        (candidate) =>
          candidate.name !== pkg.name && isInside(normalizedPackagePath, candidate.path),
      );
      if (parent) {
        // Nested frontend/Cypress workspaces are controlled by their containing package target.
        dependencies.get(parent.name).add(pkg.name);
      }
    }
  }

  const frontendDependencies = dependencies.get(frontendPackage);
  if (frontendDependencies) {
    for (const pkg of packagesByName.values()) {
      if (
        pkg.name !== frontendPackage &&
        (pkg['module-federation'] || pkg.exports?.['./extensions'])
      ) {
        // Plugin discovery and Module Federation are runtime dependencies not expressed as
        // package.json imports. Model them explicitly so feature changes reach the host tests.
        frontendDependencies.add(pkg.name);
      }
    }
  }

  const groupOwners = new Map();
  for (const group of groups) {
    if (!group.owner || !packagesByName.has(group.owner)) {
      errors.push(`Cypress group ${group.name} has no valid workspace owner.`);
      continue;
    }
    groupOwners.set(group.name, group.owner);
  }

  for (const groupOwner of new Set(groupOwners.values())) {
    if (groupOwner !== frontendPackage) {
      // Package-owned mock suites still execute against the complete dashboard host. This
      // runtime edge prevents a host or plugin change from excluding those suites merely
      // because their package manifests do not import the host application.
      dependencies.get(groupOwner)?.add(frontendPackage);
    }
  }

  const reverseDependencies = new Map([...packagesByName].map(([name]) => [name, new Set()]));
  let edgeCount = 0;
  for (const [consumer, packageDependencies] of dependencies) {
    for (const dependency of packageDependencies) {
      reverseDependencies.get(dependency).add(consumer);
      edgeCount += 1;
    }
  }

  return {
    errors: [...new Set(errors)].toSorted(),
    edgeCount,
    frontendPackage,
    groupOwners,
    packageCount: packagesByName.size,
    packageRoots,
    reverseDependencies,
  };
};

const buildWorkspaceTestIndex = ({ root, groups }) =>
  createWorkspaceTestIndex({
    packages: listWorkspacePackagesFromManifest(root),
    groups,
  });

const resolveWorkspaceFileImpact = (index, file) => {
  if (index.errors.length > 0) {
    return { error: 'The workspace dependency graph is incomplete.', details: index.errors };
  }

  const normalized = normalizePath(file);
  const owner = index.packageRoots.find((pkg) => isInside(normalized, pkg.path));
  if (!owner) {
    return { error: `No workspace owner was found for: ${normalized}`, details: [] };
  }

  const affectedPackages = new Set();
  const queue = [owner.name];
  while (queue.length > 0) {
    const next = queue.pop();
    if (affectedPackages.has(next)) {
      continue;
    }
    affectedPackages.add(next);
    queue.push(...(index.reverseDependencies.get(next) ?? []));
  }

  const selectedGroups = [...index.groupOwners]
    .filter(([, groupOwner]) => affectedPackages.has(groupOwner))
    .map(([groupName]) => groupName)
    .toSorted();
  if (selectedGroups.length === 0) {
    return {
      error: `Workspace owner ${owner.name} has no reachable Cypress mock test owner.`,
      details: [],
    };
  }

  return {
    affectedPackages: [...affectedPackages].toSorted(),
    details: [],
    owner: owner.name,
    selectedGroups,
  };
};

module.exports = {
  buildWorkspaceTestIndex,
  createWorkspaceTestIndex,
  resolveWorkspaceFileImpact,
};
