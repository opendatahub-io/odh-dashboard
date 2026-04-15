/**
 * Collect the transitive closure of @odh-dashboard/* runtime dependencies
 * starting from federated remotes and the host's own dependencies.
 * Only follows `dependencies` (not `devDependencies`), so dev tooling
 * packages like eslint-config, jest-config, tsconfig are excluded.
 *
 * @param {Array} packages - Workspace package objects from `npm query .workspace`
 * @param {Object} hostPackageJson - The host's package.json (frontend/src/package.json)
 * @returns {Set<string>} Set of runtime @odh-dashboard/* package names
 */
const getRuntimeOdhPackages = (packages, hostPackageJson) => {
  const byName = Object.fromEntries(packages.map((p) => [p.name, p]));
  const hostDeps = Object.keys(hostPackageJson.dependencies || {});
  const seeds = [
    ...hostDeps.filter((n) => n.startsWith('@odh-dashboard/')),
    ...packages.filter((p) => p['module-federation']).map((p) => p.name),
  ];

  const visited = new Set();
  const queue = [...seeds];
  while (queue.length > 0) {
    const name = queue.shift();
    if (visited.has(name)) continue;
    visited.add(name);
    const pkg = byName[name];
    if (!pkg) continue;
    for (const dep of Object.keys(pkg.dependencies || {})) {
      if (dep.startsWith('@odh-dashboard/') && !visited.has(dep)) queue.push(dep);
    }
  }
  return visited;
};

module.exports = { getRuntimeOdhPackages };
