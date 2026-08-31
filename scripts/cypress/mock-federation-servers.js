/**
 * Start or wait for Cypress mock module-federation static servers.
 *
 * Usage (from frontend/):
 *   node ../scripts/cypress/mock-federation-servers.js start
 *   node ../scripts/cypress/mock-federation-servers.js wait
 *   node ../scripts/cypress/mock-federation-servers.js urls
 */
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const { getWaitUrls, listMockFederationServers } = require('./lib/mock-federation-servers');

const findRepoRoot = (start) => {
  let dir = start;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  throw new Error(`Could not find pnpm-workspace.yaml from ${start}`);
};

const resolveServeCommand = (root) => {
  const searchPaths = [root, path.join(root, 'frontend')];
  for (const entry of ['serve/build/main.js', 'serve/bin/serve.js']) {
    try {
      return {
        command: process.execPath,
        argsPrefix: [require.resolve(entry, { paths: searchPaths })],
      };
    } catch {
      // try next entry path
    }
  }

  const serveBin = path.join(root, 'frontend', 'node_modules', '.bin', 'serve');
  if (fs.existsSync(serveBin)) {
    return { command: serveBin, argsPrefix: [] };
  }

  throw new Error('serve CLI not found. Run pnpm install from the repo root.');
};

const resolveWaitOnCommand = (root) => {
  const searchPaths = [root, path.join(root, 'frontend'), path.join(root, 'packages/cypress')];
  try {
    return {
      command: process.execPath,
      argsPrefix: [require.resolve('wait-on/bin/wait-on', { paths: searchPaths })],
    };
  } catch {
    const waitOnBin = path.join(root, 'node_modules', '.bin', 'wait-on');
    if (fs.existsSync(waitOnBin)) {
      return { command: waitOnBin, argsPrefix: [] };
    }
    throw new Error('wait-on CLI not found. Run pnpm install from the repo root.');
  }
};

const assertBuildsPresent = (servers, root) => {
  const missing = servers.filter((server) => !fs.existsSync(server.publicCypressDir));
  if (missing.length === 0) {
    return;
  }

  for (const server of missing) {
    console.error(
      `Missing public-cypress for ${server.packageName} (expected ${path.relative(
        root,
        server.publicCypressDir,
      )})`,
    );
  }
  throw new Error('Cypress mock federation builds are missing');
};

const runWait = (servers, root) => {
  assertBuildsPresent(servers, root);
  const waitOn = resolveWaitOnCommand(root);
  const urls = getWaitUrls(servers);
  console.log(`Waiting for ${urls.length} Cypress mock servers...`);
  const result = spawnSync(waitOn.command, [...waitOn.argsPrefix, '-i', '1000', ...urls], {
    stdio: 'inherit',
  });
  process.exitCode = result.status ?? 1;
};

const runStart = (servers, root) => {
  assertBuildsPresent(servers, root);
  const serve = resolveServeCommand(root);
  /** @type {import('child_process').ChildProcess[]} */
  const children = [];

  const shutdown = (signal) => {
    for (const child of children) {
      if (!child.killed) {
        child.kill(signal);
      }
    }
  };

  process.on('SIGINT', () => {
    shutdown('SIGINT');
    process.exitCode = 0;
  });
  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
    process.exitCode = 0;
  });

  for (const server of servers) {
    console.log(
      `Serving ${server.moduleName} on :${server.port} (${path.relative(
        root,
        server.publicCypressDir,
      )})`,
    );
    const child = spawn(
      serve.command,
      [...serve.argsPrefix, server.publicCypressDir, '-p', String(server.port), '-s', '-L'],
      { stdio: 'ignore' },
    );
    child.on('error', (error) => {
      console.error(`Failed to start serve on port ${server.port}:`, error.message);
      shutdown('SIGTERM');
      throw error;
    });
    children.push(child);
  }

  // Keep the process alive until concurrently sends SIGTERM.
  setInterval(() => {}, 1 << 30);
};

const main = () => {
  try {
    const command = process.argv[2];
    const root = findRepoRoot(__dirname);
    const servers = listMockFederationServers(root);

    if (command === 'urls') {
      console.log(getWaitUrls(servers).join(' '));
      return;
    }

    if (command === 'wait') {
      runWait(servers, root);
      return;
    }

    if (command === 'start') {
      runStart(servers, root);
      return;
    }

    console.error('Usage: mock-federation-servers.js <start|wait|urls>');
    process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
};

if (require.main === module) {
  main();
}

module.exports = {
  findRepoRoot,
  resolveServeCommand,
  resolveWaitOnCommand,
};
