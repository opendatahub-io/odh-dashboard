/**
 * Run dashboard mock builds or live dev servers only in workspaces that opt in to
 * the federation mock contract. Nested standalone frontend/BFF scripts have a
 * different meaning and must never be selected by a root Turbo wildcard.
 */
const { spawn } = require('child_process');
const path = require('path');

const { listMockFederationTargets } = require('./lib/mock-federation-servers');
const { listWorkspacePackagesFromManifest } = require('../query-workspace-packages');

const TASKS = {
  build: 'cypress:mock:build',
  'build-coverage': 'cypress:mock:build:coverage',
  dev: 'cypress:mock:dev',
};

const getTurboArgs = (targets, mode) => {
  const task = TASKS[mode];
  if (!task) {
    throw new Error(`Unknown dashboard mock task: ${mode}`);
  }
  const args = ['exec', 'turbo', 'run', task];
  for (const target of targets) {
    args.push(`--filter=${target.packageName}`);
  }
  if (mode === 'dev') {
    // Turbo requires strictly more concurrency than the number of persistent tasks.
    args.push(`--concurrency=${targets.length + 1}`);
  }
  return args;
};

// The root build command is also documented as E2E preparation. An E2E-only
// package (currently Model Serving) still needs its static assets, but must not
// join dashboard mock static/dev orchestration or compete for a port.
const getAdditionalE2EBuilds = (packages, targets, mode) => {
  if (mode !== 'build' && mode !== 'build-coverage') {
    return [];
  }
  const script = mode === 'build' ? 'cypress:server:build' : 'cypress:server:build:coverage';
  const selected = new Set(targets.map((target) => target.packageName));
  return packages
    .filter(
      (pkg) =>
        pkg.path !== '.' &&
        !selected.has(pkg.name) &&
        pkg.scripts?.['cypress:server:e2e'] &&
        pkg.scripts?.[script],
    )
    .map((pkg) => ['--filter', pkg.name, 'run', script]);
};

const main = () => {
  try {
    const mode = process.argv[2];
    const root = path.resolve(__dirname, '../..');
    const targets = listMockFederationTargets(root);
    if (mode === 'validate') {
      for (const target of targets) {
        console.log(`${target.packageName} :${target.port} (${target.workspacePath})`);
      }
      return;
    }
    const commands = [
      getTurboArgs(targets, mode),
      ...getAdditionalE2EBuilds(listWorkspacePackagesFromManifest(root), targets, mode),
    ];
    let activeChild;
    let stopping = false;
    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.on(signal, () => {
        stopping = true;
        activeChild?.kill(signal);
      });
    }
    const runNext = (index) => {
      if (index === commands.length || stopping) {
        return;
      }
      activeChild = spawn('pnpm', commands[index], {
        cwd: root,
        stdio: 'inherit',
        shell: process.platform === 'win32',
      });
      activeChild.on('error', (error) => console.error(error));
      activeChild.on('close', (code) => {
        if (code !== 0 || stopping) {
          process.exitCode = code || 1;
        } else {
          runNext(index + 1);
        }
      });
    };
    runNext(0);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
};

if (require.main === module) {
  main();
}

module.exports = { getAdditionalE2EBuilds, getTurboArgs };
