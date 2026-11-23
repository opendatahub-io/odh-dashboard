/* eslint-env node */
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
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
  git('config', 'commit.gpgSign', 'false');
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
  upstream.write('src/removed.txt', 'imported\n');
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
  host.git('rm', 'packages/fixture/upstream/removed.txt');
  const packageConfig = JSON.parse(fs.readFileSync(packagePath));
  packageConfig.subtree.exclude.push('removed.txt');
  fs.writeFileSync(packagePath, JSON.stringify(packageConfig));
  host.write('packages/fixture/upstream/odh/extensions.ts', 'local override\n');
  host.write('packages/fixture/upstream/included.txt', 'local edit\n');
  host.commit();
  upstream.write('src/odh/extensions.ts', 'upstream changed\n');
  upstream.write('src/included.txt', 'upstream changed\n');
  upstream.write('src/removed.txt', 'modified upstream\n');
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
  assert.deepEqual(subtree.exclude, ['odh/', 'removed.txt']);
  assert.equal(fs.existsSync(path.join(host.dir, 'packages/fixture/upstream/removed.txt')), false);
  upstream.git('rm', 'src/removed.txt');
  upstream.commit();
  sync();
  assert.equal(fs.existsSync(path.join(host.dir, 'packages/fixture/upstream/removed.txt')), false);
  assert.equal(
    JSON.parse(fs.readFileSync(packagePath)).subtree.commit,
    upstream.git('rev-parse', 'HEAD').trim(),
  );
  upstream.write('src/removed.txt', 'recreated upstream\n');
  upstream.commit();
  sync();
  assert.equal(fs.existsSync(path.join(host.dir, 'packages/fixture/upstream/removed.txt')), false);
  assert.equal(
    JSON.parse(fs.readFileSync(packagePath)).subtree.commit,
    upstream.git('rev-parse', 'HEAD').trim(),
  );
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

test('patch filtering preserves non-UTF-8 hunk bytes and UTF-8 filenames', (t) => {
  const f = fixture(t, ['excluded.txt']);
  const filename = 'src/café fixture.txt';
  const before = Buffer.from([0x63, 0x61, 0x66, 0xe9, 0x0a]);
  const after = Buffer.from([0x63, 0x61, 0x66, 0xe9, 0x20, 0xff, 0x0a]);
  f.write(filename, before);
  f.write('src/excluded.txt', before);
  f.commit();
  const base = f.git('rev-parse', 'HEAD').trim();
  f.write(filename, after);
  f.write('src/excluded.txt', after);
  f.commit();
  const input = path.join(f.dir, 'input.patch');
  const output = path.join(f.dir, 'output.patch');
  // Capture raw bytes: the fixture's string-returning git helper would corrupt this patch.
  const patch = execFileSync('git', ['format-patch', '--no-renames', '-1', '--stdout'], {
    cwd: f.dir,
  });
  fs.writeFileSync(input, patch);
  f.run('filter', input, 'src', output);
  f.git('restore', '--source', base, '--staged', '--worktree', 'src');
  fs.renameSync(path.join(f.dir, 'src'), path.join(f.dir, 'target'));
  f.git('add', '-A');
  f.git('apply', '--3way', '--index', '--directory=target', output);
  assert.deepEqual(fs.readFileSync(path.join(f.dir, 'target/café fixture.txt')), after);
  assert.deepEqual(fs.readFileSync(path.join(f.dir, 'target/excluded.txt')), before);
});

for (const direction of ['file-to-directory', 'directory-to-file']) {
  test(`initial copy handles ${direction} changes`, (t) => {
    const f = fixture(t, ['local/']);
    const sourcePath = direction === 'file-to-directory' ? 'item/nested/new.txt' : 'item';
    const destinationPath = direction === 'file-to-directory' ? 'item' : 'item/nested/old.txt';
    f.write(`source/${sourcePath}`, 'upstream');
    f.write(`destination/${destinationPath}`, 'old content');
    f.write('destination/local/keep.txt', 'local');
    f.run('copy', path.join(f.dir, 'source'), path.join(f.dir, 'destination'));
    assert.equal(fs.readFileSync(path.join(f.dir, 'destination', sourcePath), 'utf8'), 'upstream');
    assert.equal(fs.readFileSync(path.join(f.dir, 'destination/local/keep.txt'), 'utf8'), 'local');
  });
}

test('directory-to-file changes cannot remove excluded descendants', (t) => {
  const f = fixture(t, ['item/keep.txt']);
  f.write('source/item', 'upstream');
  f.write('destination/item/keep.txt', 'local');
  f.run('validate');
  assert.throws(
    () => f.run('copy', path.join(f.dir, 'source'), path.join(f.dir, 'destination')),
    /Cannot replace directory containing excluded files/,
  );
  assert.equal(fs.readFileSync(path.join(f.dir, 'destination/item/keep.txt'), 'utf8'), 'local');
});

test('file-to-directory changes cannot replace an excluded local file', (t) => {
  const f = fixture(t, ['item']);
  f.write('source/item/new.txt', 'upstream');
  f.write('destination/item', 'local');
  assert.throws(
    () => f.run('copy', path.join(f.dir, 'source'), path.join(f.dir, 'destination')),
    /Cannot replace excluded file with directory/,
  );
  assert.equal(fs.readFileSync(path.join(f.dir, 'destination/item'), 'utf8'), 'local');
});

test('rejected quoted-path patches produce recovery output and apply unaffected files', (t) => {
  const f = fixture(t, []);
  f.write('src/file with spaces.txt', 'before\n');
  f.write('src/other with spaces.txt', 'before\n');
  f.commit();
  const base = f.git('rev-parse', 'HEAD').trim();
  f.write('src/file with spaces.txt', 'upstream\n');
  f.write('src/other with spaces.txt', 'upstream\n');
  f.commit();
  // Missing base objects force direct application and then script-driven recovery.
  const patch = f
    .git('format-patch', '--no-renames', '-1', '--stdout')
    .replace(/^index [0-9a-f]+\.\./gm, 'index 1111111..');
  const input = path.join(f.dir, 'input.patch');
  const output = path.join(f.dir, 'output.patch');
  fs.writeFileSync(input, patch);
  f.run('filter', input, 'src', output);
  f.git('restore', '--source', base, '--staged', '--worktree', 'src');
  fs.mkdirSync(path.join(f.dir, 'workspace'));
  fs.renameSync(path.join(f.dir, 'src'), path.join(f.dir, 'workspace/target'));
  f.write('workspace/target/file with spaces.txt', 'local change\n');
  f.git('add', '-A');
  const result = spawnSync(
    'bash',
    [
      '-c',
      `
    set -e
    source "$COMMON"
    SCRIPT_DIR="$SCRIPTS"
    PACKAGE_JSON="$CONFIG"
    MONOREPO_ROOT="$PWD"
    WORKSPACE_LOCATION=workspace
    TARGET_RELATIVE=target
    PACKAGE_NAME=fixture
    TMP_DIR="$PWD"
    if ! git apply --directory=workspace/target --3way --index "$PATCH" 2>apply_error.log; then
      handle_apply_conflict 1 1 abc123 fixture "$PATCH" 'sync --continue' upstream
    fi
  `,
    ],
    {
      cwd: f.dir,
      encoding: 'utf8',
      env: {
        ...Object.fromEntries(
          Object.entries(process.env).filter(([key]) => key !== 'npm_config_user_agent'),
        ),
        COMMON: common,
        SCRIPTS: scriptDir,
        CONFIG: f.config,
        PATCH: output,
      },
    },
  );
  assert.equal(result.status, 1, result.stderr);
  assert.match(
    result.stdout,
    /Patch was completely rejected/,
    fs.readFileSync(path.join(f.dir, 'apply_error.log'), 'utf8'),
  );
  assert.equal(
    fs.readFileSync(path.join(f.dir, 'workspace/target/other with spaces.txt'), 'utf8'),
    'upstream\n',
  );
  const conflictFile = path.join(f.dir, 'workspace/target/file with spaces.txt');
  if (fs.existsSync(`${conflictFile}.patch`)) {
    const sidecar = fs.readFileSync(`${conflictFile}.patch`, 'utf8');
    assert.match(sidecar, /\+upstream/);
    assert.equal(sidecar.includes('other with spaces.txt'), false);
    assert.ok(fs.existsSync(`${conflictFile}.patch-info.txt`));
  } else {
    assert.match(fs.readFileSync(conflictFile, 'utf8'), /<<<<<<< PATCH FAILED TO APPLY/);
  }
  const recovered = path.join(f.dir, 'recovered.patch');
  execFileSync(process.execPath, [helper, 'extract', f.config, output, recovered], {
    cwd: f.dir,
    input: 'file with spaces.txt',
  });
  assert.ok(fs.statSync(recovered).size > 0);
  assert.deepEqual(f.run('bases', output).toString().split('\0').filter(Boolean), [
    'file with spaces.txt',
    '1111111',
    '100644',
    'other with spaces.txt',
    '1111111',
    '100644',
  ]);
  assert.deepEqual(f.run('paths', output).toString().split('\0').filter(Boolean), [
    'file with spaces.txt',
    'other with spaces.txt',
  ]);
});

for (const exclude of [undefined, []]) {
  test(`initial copies skip nested Git metadata with exclusions ${JSON.stringify(
    exclude,
  )}`, (t) => {
    const f = fixture(t, exclude);
    f.write('source/vendor/component/.git/config', 'git metadata');
    f.write('source/vendor/component/README.md', 'component sources');
    f.write('source/vendor/submodule/.git', 'gitdir: ../../.git/modules/submodule\n');
    f.write('source/vendor/submodule/main.txt', 'submodule sources');
    f.run('copy', path.join(f.dir, 'source'), path.join(f.dir, 'destination'));
    assert.equal(fs.existsSync(path.join(f.dir, 'destination/vendor/component/.git')), false);
    assert.equal(fs.existsSync(path.join(f.dir, 'destination/vendor/submodule/.git')), false);
    f.git('add', 'destination');
    assert.deepEqual(f.git('ls-files', 'destination').trim().split('\n'), [
      'destination/vendor/component/README.md',
      'destination/vendor/submodule/main.txt',
    ]);
  });
}

function syncFixture(t, upstream, { remote = false, src = '', exclude } = {}) {
  const host = fixture(t, []);
  const branch = upstream.git('branch', '--show-current').trim();
  host.write(
    'scripts/query-workspace-packages.js',
    'console.log(JSON.stringify([{ name: "fixture", path: "packages/fixture" }]));',
  );
  host.write(
    'packages/fixture/package.json',
    JSON.stringify({
      name: 'fixture',
      subtree: { repo: upstream.dir, branch, src, target: 'upstream', exclude },
    }),
  );
  host.commit();
  const sync = (...args) =>
    execFileSync(
      'bash',
      [
        path.join(scriptDir, remote ? 'package-subtree.sh' : 'package-subtree-local.sh'),
        '--package=fixture',
        ...(remote ? [] : [`--local-repo=${upstream.dir}`, `--branch=${branch}`]),
        ...args,
      ],
      {
        cwd: host.dir,
        env: Object.fromEntries(
          Object.entries(process.env).filter(([key]) => key !== 'npm_config_user_agent'),
        ),
        stdio: 'pipe',
      },
    );
  return { host, sync, target: path.join(host.dir, 'packages/fixture/upstream') };
}

for (const remote of [false, true]) {
  for (const src of ['', 'clients/ui']) {
    test(`${
      remote ? 'remote' : 'local'
    } sync preserves downstream edits across included renames (src=${src})`, (t) => {
      const upstream = fixture(t, []);
      const prefix = src ? `${src}/` : '';
      upstream.write(`${prefix}old.txt`, 'first\nsecond\nthird\nfourth\n');
      upstream.commit();
      const { host, sync, target } = syncFixture(t, upstream, { remote, src });
      sync();
      fs.writeFileSync(path.join(target, 'old.txt'), 'downstream\nsecond\nthird\nfourth\n');
      host.commit();
      upstream.git('mv', `${prefix}old.txt`, `${prefix}new.txt`);
      upstream.write(`${prefix}new.txt`, 'first\nsecond\nthird\nupstream\n');
      upstream.commit();
      sync();
      assert.equal(fs.existsSync(path.join(target, 'old.txt')), false);
      assert.equal(
        fs.readFileSync(path.join(target, 'new.txt'), 'utf8'),
        'downstream\nsecond\nthird\nupstream\n',
      );
      assert.equal(
        JSON.parse(fs.readFileSync(path.join(host.dir, 'packages/fixture/package.json'))).subtree
          .commit,
        upstream.git('rev-parse', 'HEAD').trim(),
      );
    });

    test(`${
      remote ? 'remote' : 'local'
    } sync splits renames across exclusion boundaries (src=${src})`, (t) => {
      const upstream = fixture(t, []);
      const prefix = src ? `${src}/` : '';
      upstream.write(`${prefix}included.txt`, 'moving into excluded directory\n');
      upstream.write(`${prefix}skip/out.txt`, 'moving out of excluded directory\n');
      upstream.commit();
      const { host, sync, target } = syncFixture(t, upstream, { remote, src, exclude: ['skip/'] });
      sync();
      fs.mkdirSync(path.join(target, 'skip'), { recursive: true });
      fs.writeFileSync(path.join(target, 'skip/out.txt'), 'local excluded content\n');
      host.commit();
      upstream.git('mv', `${prefix}included.txt`, `${prefix}skip/in.txt`);
      upstream.git('mv', `${prefix}skip/out.txt`, `${prefix}out.txt`);
      upstream.commit();
      sync();
      assert.equal(fs.existsSync(path.join(target, 'included.txt')), false);
      assert.equal(fs.existsSync(path.join(target, 'skip/in.txt')), false);
      assert.equal(
        fs.readFileSync(path.join(target, 'skip/out.txt'), 'utf8'),
        'local excluded content\n',
      );
      assert.equal(
        fs.readFileSync(path.join(target, 'out.txt'), 'utf8'),
        'moving out of excluded directory\n',
      );
    });
  }

  for (const invalidUtf8 of [false, true]) {
    test(
      `${
        remote ? 'remote' : 'local'
      } bootstrap and incremental sync preserve exact filename bytes (${
        invalidUtf8 ? 'non-UTF-8' : 'Git quoting'
      })`,
      {
        skip:
          invalidUtf8 && process.platform === 'darwin'
            ? 'macOS rejects non-UTF-8 filenames'
            : false,
      },
      (t) => {
        const upstream = fixture(t, []);
        const names = invalidUtf8
          ? [Buffer.from([0x63, 0x61, 0x66, 0xe9, 0x2e, 0x74, 0x78, 0x74])]
          : [
              Buffer.from('escape-\x1b.txt'),
              Buffer.from('vertical-\x0b.txt'),
              Buffer.from('quote-".txt'),
              Buffer.from('backslash-\\.txt'),
              Buffer.from('café.txt'),
            ];
        const filename = (root, name) => Buffer.concat([Buffer.from(`${root}/filenames/`), name]);
        fs.mkdirSync(path.join(upstream.dir, 'clients/ui/filenames'), { recursive: true });
        for (const name of names)
          fs.writeFileSync(filename(`${upstream.dir}/clients/ui`, name), 'before\n');
        upstream.commit();
        const { sync, target } = syncFixture(t, upstream, { remote, src: 'clients/ui' });
        sync();
        const assertFiles = (expected) => {
          assert.deepEqual(
            fs
              .readdirSync(path.join(target, 'filenames'), { encoding: 'buffer' })
              .map((name) => name.toString('hex'))
              .toSorted(),
            names.map((name) => name.toString('hex')).toSorted(),
          );
          for (const name of names)
            assert.equal(fs.readFileSync(filename(target, name), 'utf8'), expected);
        };
        assertFiles('before\n');
        for (const name of names)
          fs.writeFileSync(filename(`${upstream.dir}/clients/ui`, name), 'after\n');
        upstream.commit();
        sync();
        assertFiles('after\n');
      },
    );
  }
}

for (const mode of ['bases', 'paths']) {
  test(`a failed ${mode} helper stops its shell consumer`, (t) => {
    const f = fixture(t, []);
    f.write('apply_error.log', 'error: workspace/target/file.txt: patch does not apply\n');
    const localSource = fs.readFileSync(path.join(scriptDir, 'package-subtree-local.sh'), 'utf8');
    const baseFunction = localSource.match(/ensure_base_blobs_in_index\(\) \{[\s\S]*?\n\}/)[0];
    const result = spawnSync(
      'bash',
      [
        '-c',
        `
      set -e
      source "$COMMON"
      ${baseFunction}
      SCRIPT_DIR="$SCRIPTS"
      PACKAGE_JSON="$CONFIG"
      MONOREPO_ROOT="$PWD"
      WORKSPACE_LOCATION=workspace
      TARGET_RELATIVE=target
      PACKAGE_NAME=fixture
      TMP_DIR="$PWD"
      node() { echo "simulated helper failure" >&2; return 12; }
      if [ "$MODE" = bases ]; then
        ensure_base_blobs_in_index unused.patch workspace/target
      else
        handle_apply_conflict 1 1 abc123 fixture unused.patch 'sync --continue' upstream
      fi
      echo UNEXPECTED_CONTINUATION
    `,
      ],
      {
        cwd: f.dir,
        encoding: 'utf8',
        env: {
          ...Object.fromEntries(
            Object.entries(process.env).filter(([key]) => key !== 'npm_config_user_agent'),
          ),
          COMMON: common,
          SCRIPTS: scriptDir,
          CONFIG: f.config,
          MODE: mode,
        },
      },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /simulated helper failure/);
    assert.equal(result.stdout.includes('UNEXPECTED_CONTINUATION'), false);
  });
}

test('patch filtering, enumeration and extraction retain non-UTF-8 filename bytes', (t) => {
  const f = fixture(t, []);
  const input = path.join(f.dir, 'input.patch');
  const output = path.join(f.dir, 'output.patch');
  const recovered = path.join(f.dir, 'recovered.patch');
  const name = Buffer.from([0x63, 0x61, 0x66, 0xe9, 0x2e, 0x74, 0x78, 0x74]);
  fs.writeFileSync(
    input,
    'diff --git "a/clients/ui/caf\\351.txt" "b/clients/ui/caf\\351.txt"\n' +
      '--- "a/clients/ui/caf\\351.txt"\n+++ "b/clients/ui/caf\\351.txt"\n' +
      '@@ -1 +1 @@\n-before\n+after\n',
  );
  f.run('filter', input, 'clients/ui', output);
  assert.deepEqual(f.run('paths', output), Buffer.concat([name, Buffer.from([0])]));
  execFileSync(process.execPath, [helper, 'extract', f.config, output, recovered], {
    cwd: f.dir,
    input: name,
  });
  assert.deepEqual(fs.readFileSync(recovered), fs.readFileSync(output));
  assert.match(fs.readFileSync(output, 'ascii'), /caf\\351\.txt/);
});

test('rename metadata retains byte paths when stripping the source directory', (t) => {
  const f = fixture(t, []);
  const input = path.join(f.dir, 'input.patch');
  const output = path.join(f.dir, 'output.patch');
  fs.writeFileSync(
    input,
    'diff --git "a/clients/ui/old\\351.txt" "b/clients/ui/new\\352.txt"\n' +
      'similarity index 100%\n' +
      'rename from "clients/ui/old\\351.txt"\nrename to "clients/ui/new\\352.txt"\n',
  );
  f.run('filter', input, 'clients/ui', output);
  const patch = fs.readFileSync(output, 'ascii');
  assert.match(patch, /rename from "old\\351\.txt"/);
  assert.match(patch, /rename to "new\\352\.txt"/);
  assert.deepEqual(
    f.run('paths', output),
    Buffer.from([0x6e, 0x65, 0x77, 0xea, 0x2e, 0x74, 0x78, 0x74, 0]),
  );
});

for (const remote of [false, true]) {
  test(`notebooks excludes Tilt Dockerfile changes during ${
    remote ? 'remote' : 'local'
  } sync`, (t) => {
    const upstream = fixture(t, []);
    const filename = 'workspaces/frontend/Dockerfile.dev';
    upstream.write(filename, 'FROM upstream:base\n');
    upstream.commit();
    const { host, sync, target } = syncFixture(t, upstream, { remote, exclude: [] });
    sync();
    assert.ok(fs.existsSync(path.join(target, filename)));
    host.git('rm', `packages/fixture/upstream/${filename}`);
    const configPath = path.join(host.dir, 'packages/fixture/package.json');
    const config = JSON.parse(fs.readFileSync(configPath));
    const notebooks = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../../notebooks/package.json')),
    );
    config.subtree.exclude = notebooks.subtree.exclude;
    fs.writeFileSync(configPath, JSON.stringify(config));
    host.commit();

    for (const change of ['modify', 'delete', 'recreate']) {
      if (change === 'delete') upstream.git('rm', filename);
      else upstream.write(filename, `FROM upstream:${change}\n`);
      upstream.commit();
      sync();
      assert.equal(fs.existsSync(path.join(target, filename)), false, change);
      assert.equal(
        JSON.parse(fs.readFileSync(configPath)).subtree.commit,
        upstream.git('rev-parse', 'HEAD').trim(),
      );
      assert.equal(host.git('status', '--porcelain').trim(), '');
    }
  });
}

for (const missing of ['git', 'jq']) {
  test(`unit-test wrapper reports missing ${missing} before starting tests`, (t) => {
    const f = fixture(t, []);
    const bin = path.join(f.dir, 'bin');
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin, missing === 'git' ? 'jq' : 'git'), '#!/bin/sh\nexit 0\n', {
      mode: 0o755,
    });
    const result = spawnSync('/bin/bash', [path.join(scriptDir, 'test-unit.sh')], {
      env: { ...process.env, PATH: bin },
      encoding: 'utf8',
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, new RegExp(`require '${missing}'`));
    assert.match(result.stderr, /docs\/dev-setup.md/);
    assert.doesNotMatch(result.stderr, /jest: command not found/);
  });
}

for (const jestExit of [0, 1]) {
  test(`unit-test wrapper forwards Jest flags and respects exit ${jestExit}`, (t) => {
    const f = fixture(t, []);
    const bin = path.join(f.dir, 'bin');
    fs.mkdirSync(bin);
    for (const tool of ['git', 'jq', 'jest', 'node']) {
      fs.writeFileSync(
        path.join(bin, tool),
        tool === 'jest'
          ? `#!/bin/sh\nprintf '%s\\n' "$@" > "$ARGS_FILE"\nexit ${jestExit}\n`
          : tool === 'node'
          ? '#!/bin/sh\nprintf "%s\\n" "$@" > "$NODE_ARGS_FILE"\n'
          : '#!/bin/sh\nexit 0\n',
        { mode: 0o755 },
      );
    }
    fs.symlinkSync('/usr/bin/dirname', path.join(bin, 'dirname'));
    const argsFile = path.join(f.dir, 'args');
    const nodeArgsFile = path.join(f.dir, 'node-args');
    const result = spawnSync(
      '/bin/bash',
      [path.join(scriptDir, 'test-unit.sh'), '--coverage', '--runInBand', '--testNamePattern=a b'],
      {
        env: { ...process.env, PATH: bin, ARGS_FILE: argsFile, NODE_ARGS_FILE: nodeArgsFile },
        encoding: 'utf8',
      },
    );
    assert.equal(result.status, jestExit, result.stderr);
    assert.equal(
      fs.readFileSync(argsFile, 'utf8'),
      '--silent\n--coverage\n--runInBand\n--testNamePattern=a b\n',
    );
    assert.equal(fs.existsSync(nodeArgsFile), jestExit === 0);
    if (jestExit === 0) {
      assert.equal(
        fs.readFileSync(nodeArgsFile, 'utf8'),
        `--test\n${path.join(scriptDir, 'package-subtree-files.integration.cjs')}\n`,
      );
    }
  });
}

for (const remote of [false, true]) {
  for (const subtree of [undefined, null, { exclude: ['../invalid'] }]) {
    test(`${remote ? 'remote' : 'local'} CLI reports invalid config ${JSON.stringify(
      subtree,
    )} without mutation`, (t) => {
      const upstream = fixture(t, []);
      upstream.commit();
      const { host, sync } = syncFixture(t, upstream, { remote });
      host.write('packages/fixture/package.json', JSON.stringify({ name: 'fixture', subtree }));
      host.commit();
      const before = host.git('rev-parse', 'HEAD');
      assert.throws(sync, (error) => {
        const output = `${error.stdout}${error.stderr}`;
        assert.match(
          output,
          subtree ? /Invalid subtree exclusions/ : /Missing subtree\.(repo|target)/,
        );
        assert.doesNotMatch(output, /TypeError|at Object\./);
        assert.equal(error.status, 1);
        return true;
      });
      assert.equal(host.git('status', '--porcelain'), '');
      assert.equal(host.git('rev-parse', 'HEAD'), before);
    });
  }
}
