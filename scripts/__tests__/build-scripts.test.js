const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

const { packageManager, scripts } = require('../../package.json');

// Exercise the real orchestration commands with tiny tasks instead of compiling the dashboard.
const runScript = (script, children, mode, check) => {
  const cwd = mkdtempSync(path.join(tmpdir(), 'dashboard-build-scripts-'));
  const env = {
    ...process.env,
    PATH: `${path.resolve(__dirname, '../../node_modules/.bin')}${path.delimiter}${
      process.env.PATH
    }`,
    TASK_MODE: mode,
  };
  try {
    writeFileSync(
      path.join(cwd, 'package.json'),
      JSON.stringify({
        private: true,
        packageManager,
        scripts: Object.fromEntries(
          children.map((name, index) => [name, `exec node task.cjs ${index}`]),
        ),
      }),
    );
    writeFileSync(
      path.join(cwd, 'task.cjs'),
      `const { appendFileSync, existsSync, writeFileSync } = require('node:fs');
const id = process.argv[2];
const mode = process.env.TASK_MODE;
appendFileSync('order', id);
writeFileSync(id + '.started', '');
if (mode.startsWith('sequential')) {
  process.exit(mode === 'sequential-failure' && id === '0' ? 2 : 0);
}
if (id === '0') {
  const poll = setInterval(() => {
    if (!existsSync('1.started')) return;
    clearInterval(poll);
    if (mode === 'signal') {
      // exec replaces the script shell, so our parent is the pnpm process.
      // Killing pnpm reproduces run-p's null exit-code / lost-signal bug.
      process.kill(process.ppid, 'SIGABRT');
    } else if (mode === 'failure') {
      process.exit(2);
    }
    writeFileSync('0.finished', '');
  }, 10);
} else if (mode === 'success') {
  writeFileSync('1.finished', '');
} else {
  process.on('SIGTERM', () => {
    writeFileSync('1.terminated', '');
    process.exit(0);
  });
  // Bound the task even if the runner fails to stop it.
  setTimeout(() => writeFileSync('1.finished', ''), 3000);
}
`,
    );
    // pnpm 11 auto-installs before running scripts; prepare once to avoid concurrent installs.
    const install = spawnSync('pnpm', ['install', '--ignore-scripts'], {
      cwd,
      env,
      encoding: 'utf8',
      timeout: 15000,
    });
    assert.ifError(install.error);
    assert.equal(install.status, 0, install.stdout + install.stderr);

    // SIGABRT must not produce core dumps, and exec fixtures require a POSIX shell.
    const result = spawnSync('sh', ['-c', `ulimit -c 0; ${scripts[script]}`], {
      cwd,
      env,
      encoding: 'utf8',
      timeout: 15000,
    });
    assert.ifError(result.error);
    assert.equal(result.signal, null, result.stdout + result.stderr);
    check(result, (file) => existsSync(path.join(cwd, file)), cwd);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
};

describe('root script orchestration', { skip: process.platform === 'win32' }, () => {
  const parallelScripts = {
    build: ['build:backend', 'build:frontend'],
    dev: ['dev:backend', 'dev:frontend'],
    start: ['start:backend', 'start:frontend'],
    'start:dev': ['dev:backend', 'dev:frontend'],
    'lint:frontend:backend': ['test:lint:backend', 'test:lint:frontend'],
  };
  for (const [script, children] of Object.entries(parallelScripts)) {
    it(`${script} runs both tasks in parallel and waits for both to succeed`, () => {
      runScript(script, children, 'success', (result, exists) => {
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.ok(exists('0.finished'));
        assert.ok(exists('1.finished'));
        if (script === 'build') {
          assert.match(result.stderr + result.stdout, /\[build:backend\]/);
          assert.match(result.stderr + result.stdout, /\[build:frontend\]/);
        }
      });
    });

    for (const mode of ['failure', 'signal']) {
      it(`${script} fails and terminates the sibling task on ${mode}`, () => {
        runScript(script, children, mode, (result, exists) => {
          assert.notEqual(result.status, 0, result.stdout + result.stderr);
          assert.ok(exists('1.terminated'), result.stdout + result.stderr);
          assert.equal(exists('1.finished'), false);
        });
      });
    }
  }

  for (const [script, children] of Object.entries({
    test: ['test:backend', 'test:frontend'],
    'test:fix': ['test:fix-backend', 'test:fix-frontend'],
  })) {
    it(`${script} runs backend before frontend`, () => {
      runScript(script, children, 'sequential-success', (result, exists, cwd) => {
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.equal(readFileSync(path.join(cwd, 'order'), 'utf8'), '01');
      });
    });

    it(`${script} skips frontend when backend fails`, () => {
      runScript(script, children, 'sequential-failure', (result, exists) => {
        assert.notEqual(result.status, 0, result.stdout + result.stderr);
        assert.equal(exists('1.started'), false);
      });
    });
  }
});
