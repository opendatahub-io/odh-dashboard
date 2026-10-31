/* eslint-env node */
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const helper = path.join(__dirname, 'package-subtree-files.cjs');
const common = path.join(__dirname, 'package-subtree-common.sh');
const scriptDir = __dirname;

function fixture(t, exclude) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'subtree-exclude-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const config = path.join(dir, 'package.json');
  fs.writeFileSync(config, JSON.stringify({ subtree: { exclude } }));
  const run = (mode, ...args) =>
    execFileSync(process.execPath, [helper, mode, config, ...args], { cwd: dir, stdio: 'pipe' });
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
  git('init', '-q');
  git('config', 'core.hooksPath', path.join(dir, 'no-hooks'));
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  const write = (name, content) => {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), content);
  };
  const commit = () => {
    git('add', '.');
    git('commit', '-qm', 'fixture');
  };
  return { dir, config, run, git, write, commit };
}

for (const exclude of [undefined, [], ['local.txt', 'odh/']]) {
  test(`initial copy and delete protection: ${JSON.stringify(exclude)}`, (t) => {
    const f = fixture(t, exclude);
    f.write('source/local.txt', 'upstream');
    f.write('source/odh/extensions.ts', 'upstream');
    f.write('source/ordinary.txt', 'upstream');
    f.write('destination/local.txt', 'local');
    f.write('destination/odh/extensions.ts', 'local');
    f.write('destination/odh/removed.txt', 'local');
    f.write('destination/stale.txt', 'stale');
    f.run('copy', path.join(f.dir, 'source'), path.join(f.dir, 'destination'));
    const protectedFiles = Boolean(exclude?.length);
    assert.equal(
      fs.readFileSync(path.join(f.dir, 'destination/local.txt'), 'utf8'),
      protectedFiles ? 'local' : 'upstream',
    );
    assert.equal(fs.existsSync(path.join(f.dir, 'destination/odh/removed.txt')), protectedFiles);
    assert.equal(fs.existsSync(path.join(f.dir, 'destination/stale.txt')), false);
    assert.equal(fs.readFileSync(path.join(f.dir, 'destination/ordinary.txt'), 'utf8'), 'upstream');
  });
}

test('patches preserve excluded files while applying adds, deletes, binaries and boundary renames', (t) => {
  const f = fixture(t, ['odh/', 'exact.txt']);
  f.write('src/odh/out.txt', 'moving out\n');
  f.write('src/in.txt', 'moving in\n');
  f.write('src/exact.txt', 'before\n');
  f.write('src/delete.txt', 'delete\n');
  f.write('src/file with spaces.txt', 'before\n');
  f.write('src/é.txt', 'before\n');
  f.commit();
  const base = f.git('rev-parse', 'HEAD').trim();
  f.git('mv', 'src/odh/out.txt', 'src/out.txt');
  f.git('mv', 'src/in.txt', 'src/odh/in.txt');
  f.git('rm', 'src/delete.txt');
  f.write('src/exact.txt', 'after\n');
  f.write('src/file with spaces.txt', 'after\n');
  f.write('src/é.txt', 'after\n');
  f.write('src/binary.bin', Buffer.from([0, 1, 255]));
  f.commit();
  const input = path.join(f.dir, 'input.patch');
  const output = path.join(f.dir, 'output.patch');
  fs.writeFileSync(input, f.git('format-patch', '--no-renames', '-1', '--stdout'));
  f.run('filter', input, 'src', output);
  f.git('restore', '--source', base, '--staged', '--worktree', 'src');
  fs.renameSync(path.join(f.dir, 'src'), path.join(f.dir, 'target'));
  f.git('add', '-A');
  f.git('apply', '--3way', '--index', '--directory=target', output);
  assert.equal(fs.readFileSync(path.join(f.dir, 'target/exact.txt'), 'utf8'), 'before\n');
  assert.equal(fs.readFileSync(path.join(f.dir, 'target/odh/out.txt'), 'utf8'), 'moving out\n');
  assert.equal(fs.existsSync(path.join(f.dir, 'target/in.txt')), false);
  assert.equal(fs.existsSync(path.join(f.dir, 'target/odh/in.txt')), false);
  assert.equal(fs.existsSync(path.join(f.dir, 'target/delete.txt')), false);
  assert.equal(fs.readFileSync(path.join(f.dir, 'target/file with spaces.txt'), 'utf8'), 'after\n');
  assert.equal(fs.readFileSync(path.join(f.dir, 'target/é.txt'), 'utf8'), 'after\n');
  assert.deepEqual(
    fs.readFileSync(path.join(f.dir, 'target/binary.bin')),
    Buffer.from([0, 1, 255]),
  );
  assert.equal(fs.readFileSync(path.join(f.dir, 'target/out.txt'), 'utf8'), 'moving out\n');
});

test('excluded-only commits advance tracking through the shared sync loop', (t) => {
  const f = fixture(t, ['local.txt']);
  f.write('local.txt', 'before\n');
  f.commit();
  const base = f.git('rev-parse', 'HEAD').trim();
  f.write('local.txt', 'after\n');
  f.commit();
  const head = f.git('rev-parse', 'HEAD').trim();
  execFileSync(
    'bash',
    [
      '-c',
      `
    set -euo pipefail
    source "$COMMON"
    SCRIPT_DIR="$SCRIPTS"
    PACKAGE_JSON="$CONFIG"
    MONOREPO_ROOT="$PWD"
    WORKSPACE_LOCATION=.
    TARGET_RELATIVE=target
    PACKAGE_NAME=fixture
    TMP_DIR="$PWD"
    COMMIT_PREFIX=''
    _git_upstream_cmd() { git "$@"; }
    _filter_rev_list() { git rev-list --reverse "$1..$2"; }
    _pre_apply_hook() { :; }
    _post_iteration_hook() { :; }
    apply_patch_based_update "$BASE" "$HEAD_COMMIT" '' target
  `,
    ],
    {
      cwd: f.dir,
      env: {
        ...process.env,
        COMMON: common,
        SCRIPTS: scriptDir,
        CONFIG: f.config,
        BASE: base,
        HEAD_COMMIT: head,
      },
      stdio: 'pipe',
    },
  );
  assert.equal(JSON.parse(fs.readFileSync(f.config)).subtree.commit, head);
  assert.equal(f.git('log', '-1', '--format=%s').trim().includes('no file changes'), true);
});

for (const exclude of [
  null,
  'file',
  [''],
  ['/absolute'],
  ['../file'],
  ['dir/../file'],
  ['dir//file'],
  ['*.ts'],
  ['dir\\file'],
  [42],
]) {
  test(`reject invalid exclusions: ${JSON.stringify(exclude)}`, (t) => {
    const f = fixture(t, exclude);
    assert.throws(() => f.run('validate'), /subtree.exclude/);
  });
}

test('config overrides retain exclusions in remote, local and bootstrap modes', (t) => {
  const f = fixture(t, ['odh/']);
  for (const script of ['package-subtree.sh', 'package-subtree-local.sh']) {
    const source = fs.readFileSync(path.join(scriptDir, script), 'utf8');
    const expressions = [...source.matchAll(/'(\.subtree = [^']*)'/g)];
    assert.ok(expressions.length > 0);
    for (const [, expression] of expressions) {
      const output = execFileSync(
        'jq',
        [
          '--arg',
          'repo',
          'repo',
          '--arg',
          'branch',
          'branch',
          '--arg',
          'pr_url',
          'pr',
          '--arg',
          'origin_url',
          'origin',
          '--arg',
          'commit',
          'sha',
          expression,
          f.config,
        ],
        { encoding: 'utf8' },
      );
      assert.deepEqual(JSON.parse(output).subtree.exclude, ['odh/']);
    }
  }
});

test('included conflicts leave excluded files untouched and can be resolved before subsequent patches', (t) => {
  const f = fixture(t, ['local.txt']);
  f.write('local.txt', 'base\n');
  f.write('included.txt', 'base\n');
  f.commit();
  const base = f.git('rev-parse', 'HEAD').trim();
  f.write('local.txt', 'upstream\n');
  f.write('included.txt', 'upstream\n');
  f.commit();
  const patch = f.git('format-patch', '--no-renames', '-1', '--stdout');
  f.git('restore', '--source', base, '--staged', '--worktree', 'local.txt', 'included.txt');
  f.write('local.txt', 'local override\n');
  f.write('included.txt', 'local edit\n');
  f.commit();
  const input = path.join(f.dir, 'input.patch');
  const output = path.join(f.dir, 'output.patch');
  fs.writeFileSync(input, patch);
  f.run('filter', input, '', output);
  assert.throws(() => f.git('apply', '--3way', '--index', output));
  assert.equal(f.git('diff', '--name-only', '--diff-filter=U').trim(), 'included.txt');
  assert.equal(fs.readFileSync(path.join(f.dir, 'local.txt'), 'utf8'), 'local override\n');
  f.write('included.txt', 'resolved\n');
  f.commit();
  assert.equal(f.git('diff', '--name-only', '--diff-filter=U').trim(), '');
  assert.equal(fs.readFileSync(path.join(f.dir, 'local.txt'), 'utf8'), 'local override\n');
});

test('local CLI honors exclusions through bootstrap, conflict resolution and --continue', (t) => {
  const upstream = fixture(t, []);
  upstream.write('src/odh/extensions.ts', 'upstream base\n');
  upstream.write('src/included.txt', 'base\n');
  upstream.commit();
  const branch = upstream.git('branch', '--show-current').trim();
  const host = fixture(t, []);
  host.write(
    'scripts/query-workspace-packages.js',
    'console.log(JSON.stringify([{ name: "fixture", path: "packages/fixture" }]));',
  );
  const packagePath = path.join(host.dir, 'packages/fixture/package.json');
  host.write(
    'packages/fixture/package.json',
    JSON.stringify({
      name: 'fixture',
      subtree: { src: 'src', target: 'upstream', exclude: ['odh/'] },
    }),
  );
  host.commit();
  const sync = (...args) =>
    execFileSync(
      'bash',
      [
        path.join(scriptDir, 'package-subtree-local.sh'),
        '--package=fixture',
        `--local-repo=${upstream.dir}`,
        `--branch=${branch}`,
        ...args,
      ],
      {
        cwd: host.dir,
        encoding: 'utf8',
        env: Object.fromEntries(
          Object.entries(process.env).filter(([key]) => key !== 'npm_config_user_agent'),
        ),
        stdio: 'pipe',
      },
    );
  sync();
  assert.equal(
    fs.existsSync(path.join(host.dir, 'packages/fixture/upstream/odh/extensions.ts')),
    false,
  );
  host.write('packages/fixture/upstream/odh/extensions.ts', 'local override\n');
  host.write('packages/fixture/upstream/included.txt', 'local edit\n');
  host.commit();
  upstream.write('src/odh/extensions.ts', 'upstream changed\n');
  upstream.write('src/included.txt', 'upstream changed\n');
  upstream.commit();
  upstream.write('src/after.txt', 'next commit\n');
  upstream.commit();
  assert.throws(() => sync());
  assert.equal(
    fs.readFileSync(path.join(host.dir, 'packages/fixture/upstream/odh/extensions.ts'), 'utf8'),
    'local override\n',
  );
  assert.equal(
    host.git('diff', '--name-only', '--diff-filter=U').trim(),
    'packages/fixture/upstream/included.txt',
  );
  host.write('packages/fixture/upstream/included.txt', 'resolved\n');
  host.git('add', 'packages/fixture/upstream/included.txt');
  sync('--continue');
  assert.equal(
    fs.readFileSync(path.join(host.dir, 'packages/fixture/upstream/after.txt'), 'utf8'),
    'next commit\n',
  );
  const { subtree } = JSON.parse(fs.readFileSync(packagePath));
  assert.deepEqual(subtree.exclude, ['odh/']);
  assert.equal(subtree.commit, upstream.git('rev-parse', 'HEAD').trim());
  assert.equal(host.git('status', '--porcelain').trim(), '');
});

test('a literal file exclusion does not exclude a directory with the same name', (t) => {
  const f = fixture(t, ['odh']);
  f.write('source/odh/extensions.ts', 'upstream');
  f.run('copy', path.join(f.dir, 'source'), path.join(f.dir, 'destination'));
  assert.equal(
    fs.readFileSync(path.join(f.dir, 'destination/odh/extensions.ts'), 'utf8'),
    'upstream',
  );
});
