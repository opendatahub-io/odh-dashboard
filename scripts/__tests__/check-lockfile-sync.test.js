const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { parseLockfileImporters, findMismatches, formatFailures } = require('../check-lockfile-sync');

function writeTempLockfile(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lockfile-sync-test-'));
  const filePath = path.join(dir, 'pnpm-lock.yaml');
  fs.writeFileSync(filePath, content);
  return filePath;
}

const VALID_LOCKFILE = `lockfileVersion: '9.0'

importers:

  .:
    dependencies:
      react:
        specifier: ^18.3.1
        version: 18.3.1

  frontend:
    dependencies:
      react:
        specifier: ^18.3.1
        version: 18.3.1

  packages/foo:
    dependencies:
      react:
        specifier: ^18
        version: 18.3.1

  packages/bar:
    devDependencies:
      react:
        specifier: ^18.3.1
        version: 18.3.1
`;

const MISMATCHED_LOCKFILE = `lockfileVersion: '9.0'

importers:

  .:
    dependencies:
      react:
        specifier: ^18.3.1
        version: 18.3.1

  frontend:
    dependencies:
      react:
        specifier: ^18.3.1
        version: 18.3.7

  packages/foo:
    dependencies:
      react:
        specifier: ^18
        version: 18.3.1
`;

const SCOPED_PACKAGES_LOCKFILE = `lockfileVersion: '9.0'

importers:

  .:
    dependencies:
      '@patternfly/react-core':
        specifier: ~6.7.0
        version: 6.7.0

  frontend:
    dependencies:
      '@patternfly/react-core':
        specifier: ~6.7.0
        version: 6.7.0
`;

const PEER_SUFFIX_LOCKFILE = `lockfileVersion: '9.0'

importers:

  .:
    dependencies:
      monaco-editor:
        specifier: ^0.56.0
        version: 0.56.0

  frontend:
    dependencies:
      monaco-editor:
        specifier: ^0.56.0
        version: 0.56.0(monaco-editor@0.56.0)

  packages/foo:
    dependencies:
      react-dom:
        specifier: ^18.3.1
        version: 18.3.1(react@18.3.1)
`;

const DEV_DEPS_BOUNDARY_LOCKFILE = `lockfileVersion: '9.0'

importers:

  .:
    dependencies:
      react:
        specifier: ^18.3.1
        version: 18.3.1
    devDependencies:
      react-dom:
        specifier: ^18.3.1
        version: 18.3.1

  frontend:
    dependencies:
      react:
        specifier: ^18.3.1
        version: 18.3.1
    devDependencies:
      react-dom:
        specifier: ^18.3.1
        version: 18.3.1
`;

test('parseLockfileImporters reads version entries from the importers section', () => {
  const filePath = writeTempLockfile(VALID_LOCKFILE);
  const importers = parseLockfileImporters(filePath);

  assert.equal(Object.keys(importers).length, 4);
  assert.equal(importers['.'].react, '18.3.1');
  assert.equal(importers.frontend.react, '18.3.1');
  assert.equal(importers['packages/foo'].react, '18.3.1');
});

test('parseLockfileImporters handles quoted scoped package names', () => {
  const filePath = writeTempLockfile(SCOPED_PACKAGES_LOCKFILE);
  const importers = parseLockfileImporters(filePath);

  assert.equal(importers['.']['@patternfly/react-core'], '6.7.0');
  assert.equal(importers.frontend['@patternfly/react-core'], '6.7.0');
});

test('findMismatches returns empty when all versions match', () => {
  const filePath = writeTempLockfile(VALID_LOCKFILE);
  const importers = parseLockfileImporters(filePath);
  const failures = findMismatches(importers, ['react']);

  assert.equal(failures.length, 0);
});

test('findMismatches detects version mismatches across importers', () => {
  const filePath = writeTempLockfile(MISMATCHED_LOCKFILE);
  const importers = parseLockfileImporters(filePath);
  const failures = findMismatches(importers, ['react']);

  assert.equal(failures.length, 1);
  assert.equal(failures[0].pkg, 'react');
  assert.ok(failures[0].versions['18.3.1']);
  assert.ok(failures[0].versions['18.3.7']);
  assert.ok(failures[0].versions['18.3.1'].includes('.'));
  assert.ok(failures[0].versions['18.3.7'].includes('frontend'));
});

test('findMismatches strips peer-dependency suffixes before comparing', () => {
  const filePath = writeTempLockfile(PEER_SUFFIX_LOCKFILE);
  const importers = parseLockfileImporters(filePath);
  const failures = findMismatches(importers, ['monaco-editor', 'react-dom']);

  assert.equal(failures.length, 0);
});

test('findMismatches ignores devDependencies when checking sync', () => {
  const filePath = writeTempLockfile(DEV_DEPS_BOUNDARY_LOCKFILE);
  const importers = parseLockfileImporters(filePath);

  // react is in dependencies of both importers — should be synced
  const reactFailures = findMismatches(importers, ['react']);
  assert.equal(reactFailures.length, 0);

  // react-dom is only in devDependencies — the parser should NOT pick it up
  // (it only tracks the dependencies section, not devDependencies)
  assert.ok(!importers['.']['react-dom'] || importers['.']['react-dom'] === undefined);
});

test('findMismatches returns empty for packages not in the lockfile', () => {
  const filePath = writeTempLockfile(VALID_LOCKFILE);
  const importers = parseLockfileImporters(filePath);
  const failures = findMismatches(importers, ['nonexistent-package']);

  assert.equal(failures.length, 0);
});

test('formatFailures produces readable output with package names and versions', () => {
  const failures = [
    {
      pkg: 'react',
      versions: {
        '18.3.1': ['.', 'packages/foo'],
        '18.3.7': ['frontend'],
      },
    },
  ];
  const output = formatFailures(failures);

  assert.ok(output.includes('LOCKFILE SYNC FAILURES'));
  assert.ok(output.includes('react:'));
  assert.ok(output.includes('18.3.1'));
  assert.ok(output.includes('18.3.7'));
  assert.ok(output.includes('frontend'));
});

test('script exits 0 on valid lockfile, exits 1 on mismatch', () => {
  const { execFileSync } = require('child_process');
  const scriptPath = path.resolve(__dirname, '..', 'check-lockfile-sync.js');

  // Valid lockfile → exit 0
  const validPath = writeTempLockfile(VALID_LOCKFILE);
  const validResult = execFileSync('node', [scriptPath, validPath], { stdio: 'pipe' });
  assert.ok(validResult.toString().includes('passed'));

  // Mismatched lockfile → exit 1
  const mismatchedPath = writeTempLockfile(MISMATCHED_LOCKFILE);
  let threw = false;
  try {
    execFileSync('node', [scriptPath, mismatchedPath], { stdio: 'pipe' });
  } catch (err) {
    threw = true;
    assert.equal(err.status, 1);
    assert.ok(err.stderr.toString().includes('18.3.1'));
    assert.ok(err.stderr.toString().includes('18.3.7'));
  }
  assert.ok(threw, 'script should exit 1 on mismatch');
});
