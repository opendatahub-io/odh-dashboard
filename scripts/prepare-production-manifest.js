/**
 * Reduces the root package.json to a production-only workspace manifest.
 *
 * npm prune --omit=dev does not correctly handle npm workspaces — it only
 * removes root-level devDependencies while leaving all workspace devDependencies
 * hoisted in node_modules/. This script replaces the root package.json with a
 * minimal manifest so that a subsequent `npm install --omit=dev` re-installs
 * only runtime-relevant packages.
 *
 * Fields preserved:
 *   - name, private          — required by npm
 *   - workspaces             — narrowed to runtime-only workspaces
 *   - dependencies           — root runtime deps (some are shared with backend)
 *   - overrides              — CRITICAL: npm ignores overrides declared in
 *                              workspace packages, so these root overrides are
 *                              the sole mechanism that pins transitive deps to
 *                              their CVE-remediated versions
 *   - engines, packageManager — keep consistency with CI expectations
 */

const fs = require('fs');

const RUNTIME_WORKSPACES = ['backend', 'packages/app-config'];

const root = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const reduced = {
  name: root.name,
  private: true,
  workspaces: RUNTIME_WORKSPACES,
  dependencies: root.dependencies,
  overrides: root.overrides,
  engines: root.engines,
  packageManager: root.packageManager,
};

for (const k of Object.keys(reduced)) {
  if (reduced[k] == null) {
    delete reduced[k];
  }
}

fs.writeFileSync('package.json', `${JSON.stringify(reduced, null, 2)}\n`);

console.log('Reduced package.json to runtime-only manifest');
console.log('  workspaces:', RUNTIME_WORKSPACES);
console.log('  dependencies:', Object.keys(reduced.dependencies || {}));
console.log('  overrides:', Object.keys(reduced.overrides || {}));
