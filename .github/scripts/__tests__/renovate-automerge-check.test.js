/**
 * Tests for .github/scripts/renovate-automerge-check.js.
 *
 * The script decides whether a Renovate PR gets `lgtm` + `approved` from
 * renovate-auto-merge.yml, so a regression here widens what merges without a
 * human. Pure helpers are unit-tested directly; the end-to-end cases build a
 * throwaway git repo and run the script the way the workflow does.
 *
 * Run: node --test .github/scripts/__tests__/*.test.js
 * The npm cases need `yq` (preinstalled on GitHub-hosted runners). Without it
 * they are skipped rather than failed, so the suite still runs locally.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SCRIPT = path.join(__dirname, '..', 'renovate-automerge-check.js');
const {
  classify,
  parseGoMod,
  parseSpec,
  sameValue,
  snapshotName,
  stable,
  uniqueChanges,
} = require(SCRIPT);

const haveGit = spawnSync('git', ['--version']).status === 0;
const haveYq = spawnSync('yq', ['--version']).status === 0;
const integration = haveGit && haveYq ? test : test.skip;

// ── unit: version classification ─────────────────────────────────────────

test('classify accepts patches and stable minors', () => {
  assert.equal(classify('foo', '1.2.3', '1.2.4'), 'patch');
  assert.equal(classify('foo', '1.2.3', '1.3.0'), 'minor');
  assert.equal(classify('foo', 'v1.2.3', 'v1.2.4'), 'patch');
});

test('classify refuses everything outside an eligible update', () => {
  assert.throws(() => classify('foo', '1.2.3', '2.0.0'), /major update/);
  assert.throws(() => classify('foo', '1.2.3', '1.2.2'), /downgrade/);
  assert.throws(() => classify('foo', '1.2.3', '1.3.0-rc.1'), /not a stable-release/);
  assert.throws(() => classify('foo', '0.9.0', '0.10.0'), /pre-1\.0/);
  assert.throws(() => classify('foo', '1.2.3', '1.2.3+build'), /not a stable-release/);
});

test('stable rejects pseudo-versions and ranges', () => {
  assert.deepEqual(stable('v1.2.3'), [1, 2, 3]);
  assert.equal(stable('v0.0.0-20240101000000-abcdef123456'), null);
  assert.equal(stable('^1.2.3'), null);
  assert.equal(stable(undefined), null);
});

// ── unit: package.json specifiers ────────────────────────────────────────

test('parseSpec accepts plain semver ranges', () => {
  assert.deepEqual(parseSpec('^1.2.3'), { op: '^', version: '1.2.3' });
  assert.deepEqual(parseSpec('~1.2.3'), { op: '~', version: '1.2.3' });
  assert.deepEqual(parseSpec('1.2.3'), { op: '', version: '1.2.3' });
  assert.deepEqual(parseSpec('>=1.2.3'), { op: '>=', version: '1.2.3' });
});

test('parseSpec refuses aliases, URLs and workspace protocols', () => {
  ['workspace:*', 'catalog:', 'npm:other@1.2.3', 'file:../x', 'latest', '*', ''].forEach((s) => {
    assert.equal(parseSpec(s), null, `${s} should not parse`);
  });
});

// ── unit: pnpm graph keys ────────────────────────────────────────────────

test('snapshotName strips version and peer suffix', () => {
  assert.equal(snapshotName('foo@1.2.3'), 'foo');
  assert.equal(snapshotName('/foo@1.2.3'), 'foo');
  assert.equal(snapshotName('@scope/pkg@1.2.3'), '@scope/pkg');
  assert.equal(snapshotName('foo@1.2.3(react@18.3.1)'), 'foo');
  // Real pnpm v9 keys carry no leading slash and nest peers several levels deep.
  assert.equal(snapshotName('@babel/core@7.29.7(supports-color@8.1.1)'), '@babel/core');
  assert.equal(
    snapshotName(
      '@babel/helper-define-polyfill-provider@0.6.8(@babel/core@7.29.7(supports-color@8.1.1))(supports-color@8.1.1)',
    ),
    '@babel/helper-define-polyfill-provider',
  );
  assert.equal(snapshotName('1.2.3'), '');
});

// ── unit: go.mod parsing ─────────────────────────────────────────────────

test('parseGoMod separates requires from other directives', () => {
  const [requires, other] = parseGoMod(
    [
      'module example.com/m',
      '',
      'go 1.22',
      '',
      'require (',
      '\tgithub.com/x/y v1.2.3',
      '\tgithub.com/z/w v1.0.0 // indirect',
      ')',
      '',
      'replace github.com/x/y => ../y',
      '',
    ].join('\n'),
  );
  assert.deepEqual(requires['github.com/x/y'], ['v1.2.3', false]);
  assert.deepEqual(requires['github.com/z/w'], ['v1.0.0', true]);
  assert.deepEqual(other, ['go 1.22', 'module example.com/m', 'replace github.com/x/y => ../y']);
});

test('parseGoMod is insensitive to non-require ordering', () => {
  const a = parseGoMod('module m\n\ngo 1.22\n\nrequire github.com/x/y v1.2.3\n');
  const b = parseGoMod('module m\n\ngo 1.22\nrequire github.com/x/y v1.2.3\n');
  assert.deepEqual(a, b);
});

// ── unit: comparison helpers ─────────────────────────────────────────────

test('sameValue ignores object key order but not array order', () => {
  assert.equal(sameValue({ a: 1, b: 2 }, { b: 2, a: 1 }), true);
  assert.equal(sameValue(['a', 'b'], ['b', 'a']), false);
  assert.equal(sameValue({ a: [1, 2] }, { a: [1, 2] }), true);
});

test('uniqueChanges deduplicates identical triples only', () => {
  assert.deepEqual(
    uniqueChanges([
      ['foo', '1.0.0', '1.0.1'],
      ['foo', '1.0.0', '1.0.1'],
      ['foo', '1.0.0', '1.1.0'],
    ]),
    [
      ['foo', '1.0.0', '1.0.1'],
      ['foo', '1.0.0', '1.1.0'],
    ],
  );
});

// ── integration: a throwaway repo the script runs against ────────────────

const git = (dir, ...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();

const writeFiles = (dir, files) => {
  Object.entries(files).forEach(([rel, content]) => {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  });
};

const commitFiles = (dir, files, message) => {
  writeFiles(dir, files);
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', message);
  return git(dir, 'rev-parse', 'HEAD');
};

/** Creates a repo at the base commit and returns {dir, base}. */
const makeRepo = (files) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'renovate-check-'));
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 'test@example.com');
  git(dir, 'config', 'user.name', 'test');
  const base = commitFiles(dir, files, 'base');
  return { dir, base };
};

/** Runs the checker exactly as the workflow does; returns {eligible, output}. */
const run = (dir, base, head, tier) => {
  const res = spawnSync(process.execPath, [SCRIPT, base, head, tier], {
    cwd: dir,
    encoding: 'utf8',
  });
  const output = `${res.stdout}${res.stderr}`;
  assert.equal(res.status, 0, `checker exited ${res.status}:\n${output}`);
  const m = /^eligible=(true|false)$/m.exec(res.stdout);
  assert.ok(m, `no eligible line in:\n${output}`);
  return { eligible: m[1] === 'true', output };
};

// ── fixtures ─────────────────────────────────────────────────────────────

const lock = ({
  root = '1.0.1',
  workspace = '1.0.1',
  barDeps = { foo: '1.0.1' },
  extraPackages = '',
  extraSnapshots = '',
  localResolution = null,
} = {}) => {
  const barLines = Object.entries(barDeps)
    .map(([dep, version]) => `      ${dep}: ${version}`)
    .join('\n');
  const localPackage = localResolution
    ? `  local@1.0.0:\n    resolution: {${localResolution}}\n`
    : '';
  const localSnapshot = localResolution ? '  local@1.0.0: {}\n' : '';
  return `
lockfileVersion: '9.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

importers:
  .:
    dependencies:
      foo:
        specifier: ^1.0.0
        version: ${root}
  packages/a:
    dependencies:
      foo:
        specifier: ^1.0.0
        version: ${workspace}

packages:
  foo@1.0.1:
    resolution: {integrity: sha512-AAA}
  foo@1.0.2:
    resolution: {integrity: sha512-BBB}
  bar@2.0.0:
    resolution: {integrity: sha512-BAR}
${localPackage}${extraPackages}
snapshots:
  foo@1.0.1: {}
  foo@1.0.2: {}
  bar@2.0.0:
    dependencies:
${barLines}
${localSnapshot}${extraSnapshots}
`;
};

const rootManifest = '{\n  "name": "root",\n  "dependencies": { "foo": "^1.0.0" }\n}\n';
const workspaceManifest = '{\n  "name": "a",\n  "dependencies": { "foo": "^1.0.0" }\n}\n';

const npmRepo = () =>
  makeRepo({
    'package.json': rootManifest,
    'packages/a/package.json': workspaceManifest,
    'pnpm-lock.yaml': lock({}),
  });

const GO_BASE = `module example.com/m

go 1.22

require (
\tgithub.com/x/y v1.2.3
)

require (
\tgithub.com/a/b v0.9.0 // indirect
)
`;

const goSum = (y, indirect) =>
  [
    `github.com/x/y ${y} h1:AAA=`,
    `github.com/x/y ${y}/go.mod h1:AAA=`,
    ...(indirect
      ? [`github.com/a/b ${indirect} h1:BBB=`, `github.com/a/b ${indirect}/go.mod h1:BBB=`]
      : []),
    '',
  ].join('\n');

// ── integration: npm ─────────────────────────────────────────────────────

integration('npm-patch: a plain lockfile bump is eligible', () => {
  const { dir, base } = npmRepo();
  const head = commitFiles(
    dir,
    { 'pnpm-lock.yaml': lock({ root: '1.0.2', workspace: '1.0.2' }) },
    'bump foo',
  );
  const { eligible, output } = run(dir, base, head, 'npm-patch');
  assert.equal(eligible, true, output);
});

integration('npm-patch: a minor bump in a patch tier is refused', () => {
  const { dir, base } = npmRepo();
  const head = commitFiles(
    dir,
    {
      'pnpm-lock.yaml': lock({ root: '1.1.0', workspace: '1.1.0' }),
      'package.json': rootManifest.replace('^1.0.0', '^1.1.0'),
      'packages/a/package.json': workspaceManifest.replace('^1.0.0', '^1.1.0'),
    },
    'bump foo minor',
  );
  const { eligible, output } = run(dir, base, head, 'npm-patch');
  assert.equal(eligible, false, output);
  assert.match(output, /minor update in a patch tier/);
});

integration('npm: a specifier change in another workspace is refused', () => {
  // Root's foo moves a patch; workspace `a` quietly widens to a major range.
  const { dir, base } = npmRepo();
  const head = commitFiles(
    dir,
    {
      'pnpm-lock.yaml': lock({ root: '1.0.2', workspace: '1.0.1' }),
      'packages/a/package.json': workspaceManifest.replace('^1.0.0', '^2.0.0'),
    },
    'cross-workspace specifier',
  );
  const { eligible, output } = run(dir, base, head, 'npm-patch');
  assert.equal(eligible, false, output);
  assert.match(output, /without a matching lockfile change for importer 'packages\/a'/);
});

integration('npm: a range-operator change is refused', () => {
  const { dir, base } = npmRepo();
  const head = commitFiles(
    dir,
    {
      'pnpm-lock.yaml': lock({ root: '1.0.2', workspace: '1.0.2' }),
      'package.json': rootManifest.replace('^1.0.0', '~1.0.2'),
      'packages/a/package.json': workspaceManifest.replace('^1.0.0', '^1.0.2'),
    },
    'operator change',
  );
  const { eligible, output } = run(dir, base, head, 'npm-patch');
  assert.equal(eligible, false, output);
  assert.match(output, /range operator changed/);
});

integration('npm: a non-registry resolution is refused', () => {
  const { dir, base } = npmRepo();
  const head = commitFiles(
    dir,
    {
      'pnpm-lock.yaml': lock({
        root: '1.0.2',
        workspace: '1.0.2',
        extraPackages:
          '  evil@1.0.0:\n    resolution: {tarball: https://example.invalid/evil.tgz}\n',
      }),
    },
    'tarball',
  );
  const { eligible, output } = run(dir, base, head, 'npm-patch');
  assert.equal(eligible, false, output);
  assert.match(output, /resolves outside the registry/);
});

integration('npm: tampering with an unrelated snapshot is refused', () => {
  const { dir, base } = npmRepo();
  const tampered = lock({ root: '1.0.2', workspace: '1.0.2' }).replace(
    'bar@2.0.0:\n    resolution: {integrity: sha512-BAR}',
    'bar@2.0.0:\n    resolution: {integrity: sha512-EVIL}',
  );
  const head = commitFiles(dir, { 'pnpm-lock.yaml': tampered }, 'tamper bar');
  const { eligible, output } = run(dir, base, head, 'npm-patch');
  assert.equal(eligible, false, output);
  assert.match(output, /'bar' is not a changed direct dependency/);
});

integration('npm: changing an unrelated package.json field is refused', () => {
  const { dir, base } = npmRepo();
  const head = commitFiles(
    dir,
    {
      'pnpm-lock.yaml': lock({ root: '1.0.2', workspace: '1.0.2' }),
      'package.json':
        '{\n  "name": "root",\n  "scripts": { "postinstall": "curl evil" },\n  "dependencies": { "foo": "^1.0.0" }\n}\n',
    },
    'postinstall',
  );
  const { eligible, output } = run(dir, base, head, 'npm-patch');
  assert.equal(eligible, false, output);
  assert.match(output, /'scripts' changed/);
});

integration('npm-patch: an unchanged package may follow a bumped transitive dep', () => {
  // pnpm records resolved versions of each package's own dependencies, so a
  // shared transitive bump legitimately rewrites entries for packages that are
  // not themselves being updated. Refusing those would block every real PR.
  const { dir, base } = makeRepo({
    'package.json': rootManifest,
    'packages/a/package.json': workspaceManifest,
    'pnpm-lock.yaml': lock({ barDeps: { foo: '1.0.1' } }),
  });
  const head = commitFiles(
    dir,
    {
      'pnpm-lock.yaml': lock({
        root: '1.0.2',
        workspace: '1.0.2',
        barDeps: { foo: '1.0.2' },
      }),
    },
    'bump foo, bar follows',
  );
  const { eligible, output } = run(dir, base, head, 'npm-patch');
  assert.equal(eligible, true, output);
});

integration('npm: a snapshot dependency moving to an unrelated package is refused', () => {
  const { dir, base } = makeRepo({
    'package.json': rootManifest,
    'packages/a/package.json': workspaceManifest,
    'pnpm-lock.yaml': lock({ barDeps: { foo: '1.0.1', baz: '3.0.0' } }),
  });
  const head = commitFiles(
    dir,
    {
      'pnpm-lock.yaml': lock({
        root: '1.0.2',
        workspace: '1.0.2',
        barDeps: { foo: '1.0.2', baz: '3.0.1' },
      }),
    },
    'bump baz too',
  );
  const { eligible, output } = run(dir, base, head, 'npm-patch');
  assert.equal(eligible, false, output);
  assert.match(output, /'bar' is not a changed direct dependency/);
});

integration('npm-patch: a pre-existing local resolution does not block the update', () => {
  const local = 'directory: ../vendor';
  const { dir, base } = makeRepo({
    'package.json': rootManifest,
    'packages/a/package.json': workspaceManifest,
    'pnpm-lock.yaml': lock({ localResolution: local }),
  });
  const head = commitFiles(
    dir,
    {
      'pnpm-lock.yaml': lock({ root: '1.0.2', workspace: '1.0.2', localResolution: local }),
    },
    'bump foo',
  );
  const { eligible, output } = run(dir, base, head, 'npm-patch');
  assert.equal(eligible, true, output);
});

integration('npm-minor: a legitimate specifier bump is eligible', () => {
  const { dir, base } = npmRepo();
  const head = commitFiles(
    dir,
    {
      'pnpm-lock.yaml': lock({ root: '1.1.0', workspace: '1.1.0' }),
      'package.json': rootManifest.replace('^1.0.0', '^1.1.0'),
      'packages/a/package.json': workspaceManifest.replace('^1.0.0', '^1.1.0'),
    },
    'minor bump',
  );
  const { eligible, output } = run(dir, base, head, 'npm-minor');
  assert.equal(eligible, true, output);
});

integration('npm-patch: an exact pin bump is eligible', () => {
  const { dir, base } = makeRepo({
    'package.json': '{\n  "name": "root",\n  "dependencies": { "foo": "1.0.1" }\n}\n',
    'pnpm-lock.yaml': lock({ root: '1.0.1', workspace: '1.0.1' }),
  });
  const head = commitFiles(
    dir,
    {
      'package.json': '{\n  "name": "root",\n  "dependencies": { "foo": "1.0.2" }\n}\n',
      'pnpm-lock.yaml': lock({ root: '1.0.2', workspace: '1.0.2' }),
    },
    'pin bump',
  );
  const { eligible, output } = run(dir, base, head, 'npm-patch');
  assert.equal(eligible, true, output);
});

// ── integration: go ──────────────────────────────────────────────────────

const goRepo = () =>
  makeRepo({
    'go.mod': GO_BASE,
    'go.sum': goSum('v1.2.3', 'v0.9.0'),
  });

integration('go-patch: a direct patch bump with tidy bookkeeping is eligible', () => {
  const { dir, base } = goRepo();
  const head = commitFiles(
    dir,
    {
      'go.mod': GO_BASE.replace('v1.2.3', 'v1.2.4').replace(
        '\nrequire (\n\tgithub.com/a/b v0.9.0 // indirect\n)\n',
        '\n',
      ),
      'go.sum': goSum('v1.2.4', null),
    },
    'bump y, drop indirect',
  );
  const { eligible, output } = run(dir, base, head, 'go-patch');
  assert.equal(eligible, true, output);
});

integration('go: an unexplained indirect version change is refused', () => {
  const { dir, base } = goRepo();
  const head = commitFiles(
    dir,
    {
      'go.mod': GO_BASE.replace('v1.2.3', 'v1.2.4').replace('v0.9.0', 'v0.10.0'),
      'go.sum': goSum('v1.2.4', 'v0.10.0'),
    },
    'indirect bump',
  );
  const { eligible, output } = run(dir, base, head, 'go-patch');
  assert.equal(eligible, false, output);
  assert.match(output, /indirect require github\.com\/a\/b.*changed/);
});

integration('go: a pseudo-version indirect addition is refused', () => {
  const { dir, base } = goRepo();
  const head = commitFiles(
    dir,
    {
      'go.mod': `${GO_BASE.replace(
        'v1.2.3',
        'v1.2.4',
      )}\nrequire github.com/c/d v0.0.0-20240101000000-abcdef123456 // indirect\n`,
      'go.sum': `${goSum(
        'v1.2.4',
        'v0.9.0',
      )}github.com/c/d v0.0.0-20240101000000-abcdef123456 h1:CCC=\n`,
    },
    'pseudo indirect',
  );
  const { eligible, output } = run(dir, base, head, 'go-patch');
  assert.equal(eligible, false, output);
  assert.match(output, /not a stable release/);
});

integration('go-patch: an added indirect present in go.sum is eligible', () => {
  const { dir, base } = goRepo();
  const head = commitFiles(
    dir,
    {
      'go.mod': `${GO_BASE.replace(
        'v1.2.3',
        'v1.2.4',
      )}\nrequire github.com/c/d v1.0.0 // indirect\n`,
      'go.sum': `${goSum(
        'v1.2.4',
        'v0.9.0',
      )}github.com/c/d v1.0.0 h1:CCC=\ngithub.com/c/d v1.0.0/go.mod h1:CCC=\n`,
    },
    'indirect added',
  );
  const { eligible, output } = run(dir, base, head, 'go-patch');
  assert.equal(eligible, true, output);
});

integration('go: an added indirect missing from go.sum is refused', () => {
  const { dir, base } = goRepo();
  const head = commitFiles(
    dir,
    {
      'go.mod': `${GO_BASE.replace(
        'v1.2.3',
        'v1.2.4',
      )}\nrequire github.com/c/d v1.0.0 // indirect\n`,
      'go.sum': goSum('v1.2.4', 'v0.9.0'),
    },
    'indirect missing from sum',
  );
  const { eligible, output } = run(dir, base, head, 'go-patch');
  assert.equal(eligible, false, output);
  assert.match(output, /is not in go\.sum/);
});

integration('go: changing go.mod directives is refused', () => {
  const { dir, base } = goRepo();
  const head = commitFiles(
    dir,
    {
      'go.mod': GO_BASE.replace('go 1.22', 'go 1.23').replace('v1.2.3', 'v1.2.4'),
      'go.sum': goSum('v1.2.4', 'v0.9.0'),
    },
    'go directive',
  );
  const { eligible, output } = run(dir, base, head, 'go-patch');
  assert.equal(eligible, false, output);
  assert.match(output, /non-require content changed/);
});

// ── integration: tier and file-scope guards ──────────────────────────────

integration('a tier that is not auto-merge eligible is refused', () => {
  const { dir, base } = npmRepo();
  const head = commitFiles(
    dir,
    { 'pnpm-lock.yaml': lock({ root: '1.0.2', workspace: '1.0.2' }) },
    'bump foo',
  );
  const { eligible, output } = run(dir, base, head, 'npm-minor-pre1');
  assert.equal(eligible, false, output);
  assert.match(output, /not auto-merge eligible/);
});

integration('an empty diff is refused', () => {
  const { dir, base } = npmRepo();
  const { eligible, output } = run(dir, base, base, 'npm-patch');
  assert.equal(eligible, false, output);
  assert.match(output, /empty diff/);
});

integration('files outside the ecosystem manifests are refused', () => {
  const { dir, base } = npmRepo();
  const head = commitFiles(
    dir,
    {
      'pnpm-lock.yaml': lock({ root: '1.0.2', workspace: '1.0.2' }),
      '.github/workflows/evil.yml': 'on: push\n',
    },
    'workflow edit',
  );
  const { eligible, output } = run(dir, base, head, 'npm-patch');
  assert.equal(eligible, false, output);
  assert.match(output, /files outside npm manifests/);
});

integration('upstream-synced paths are refused', () => {
  const { dir, base } = makeRepo({
    'packages/x/upstream/go.mod': GO_BASE,
    'packages/x/upstream/go.sum': goSum('v1.2.3', 'v0.9.0'),
  });
  const head = commitFiles(
    dir,
    {
      'packages/x/upstream/go.mod': GO_BASE.replace('v1.2.3', 'v1.2.4'),
      'packages/x/upstream/go.sum': goSum('v1.2.4', 'v0.9.0'),
    },
    'upstream bump',
  );
  const { eligible, output } = run(dir, base, head, 'go-patch');
  assert.equal(eligible, false, output);
  assert.match(output, /upstream-synced files/);
});
