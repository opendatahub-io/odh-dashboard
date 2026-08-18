/** Resolve repo root from this script's location (same as query-workspace-packages.js). */
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

const WORKSPACE_QUERY_SCRIPT = path.join(
  findRepoRoot(path.dirname(__filename)),
  'scripts/query-workspace-packages.js',
);

module.exports = { WORKSPACE_QUERY_SCRIPT };
