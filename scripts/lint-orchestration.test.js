const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { lintPlan } = require('./lint-orchestration');

function fixturePackage(root, relativePath, name, scripts, extra = {}) {
  const packagePath = path.join(root, relativePath);
  fs.mkdirSync(packagePath, { recursive: true });
  fs.writeFileSync(
    path.join(packagePath, 'package.json'),
    JSON.stringify({ name, scripts, ...extra }),
  );
  return { name, path: packagePath };
}

test('selects the delegated parent for exclusion and the child as owner', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-ownership-'));
  const parent = fixturePackage(
    root,
    'parent',
    'parent-package',
    { lint: 'cd frontend && pnpm run lint', 'lint:fix': 'cd frontend && pnpm run lint:fix' },
    { 'lint:delegates': ['frontend'] },
  );
  const child = fixturePackage(
    root,
    'parent/frontend',
    'child-package',
    { lint: 'eslint .', 'lint:fix': 'eslint . --fix' },
    { 'lint:owner': true },
  );

  assert.deepEqual(lintPlan([parent, child]), {
    delegatedParents: ['parent-package'],
    delegatedTargets: ['child-package'],
  });
});

test('rejects a new parent-to-child delegation without metadata', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-ownership-'));
  const parent = fixturePackage(root, 'parent', 'parent-package', {
    lint: 'cd frontend && pnpm run lint',
    'lint:fix': 'cd frontend && pnpm run lint:fix',
  });
  const child = fixturePackage(
    root,
    'parent/frontend',
    'child-package',
    { lint: 'eslint .' },
    {
      'lint:owner': true,
    },
  );

  assert.throws(() => lintPlan([parent, child]), /must declare its lint delegation/);
});

test('rejects multiple parents delegating the same source tree', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-ownership-'));
  const parentOne = fixturePackage(
    root,
    'parent-one',
    'parent-one',
    { lint: 'cd ../shared && pnpm run lint', 'lint:fix': 'cd ../shared && pnpm run lint:fix' },
    { 'lint:delegates': ['../shared'] },
  );
  const parentTwo = fixturePackage(
    root,
    'parent-two',
    'parent-two',
    { lint: 'cd ../shared && pnpm run lint', 'lint:fix': 'cd ../shared && pnpm run lint:fix' },
    { 'lint:delegates': ['../shared'] },
  );
  const child = fixturePackage(
    root,
    'shared',
    'shared-owner',
    { lint: 'eslint .', 'lint:fix': 'eslint . --fix' },
    { 'lint:owner': true },
  );

  assert.throws(() => lintPlan([parentOne, parentTwo, child]), /multiple lint owners/);
});
