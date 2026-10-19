const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { getAdditionalE2EBuilds, getTurboArgs } = require('../run-mock-federation-task');

const targets = [
  { packageName: 'odh-dashboard-frontend' },
  { packageName: '@odh-dashboard/automl' },
];

describe('getTurboArgs', () => {
  it('selects only explicitly opted-in workspaces for live dev', () => {
    assert.deepEqual(getTurboArgs(targets, 'dev'), [
      'exec',
      'turbo',
      'run',
      'cypress:mock:dev',
      '--filter=odh-dashboard-frontend',
      '--filter=@odh-dashboard/automl',
      '--concurrency=3',
    ]);
  });

  it('selects the matching build and coverage contracts', () => {
    assert.deepEqual(getTurboArgs(targets, 'build').slice(0, 4), [
      'exec',
      'turbo',
      'run',
      'cypress:mock:build',
    ]);
    assert.deepEqual(getTurboArgs(targets, 'build-coverage').slice(0, 4), [
      'exec',
      'turbo',
      'run',
      'cypress:mock:build:coverage',
    ]);
    assert.throws(() => getTurboArgs(targets, 'unknown'), /Unknown dashboard mock task/);
  });
});

const packages = [
  { name: 'odh-dashboard', path: '.', scripts: { 'cypress:server:e2e': 'turbo run' } },
  {
    name: '@odh-dashboard/automl',
    path: 'packages/automl',
    scripts: { 'cypress:server:e2e': 'make dev-bff' },
  },
  {
    name: '@odh-dashboard/model-serving',
    path: 'packages/model-serving',
    scripts: {
      'cypress:server:e2e': 'pnpm run cypress:server',
      'cypress:server:build': 'pnpm run build',
      'cypress:server:build:coverage': 'pnpm run build:coverage',
    },
  },
  {
    name: '@odh-dashboard/standalone',
    path: 'packages/standalone',
    scripts: { 'cypress:server:build': 'pnpm run build' },
  },
];

describe('getAdditionalE2EBuilds', () => {
  it('retains build-only E2E assets without starting the E2E server for mock tests', () => {
    assert.deepEqual(getAdditionalE2EBuilds(packages, targets, 'build'), [
      ['--filter', '@odh-dashboard/model-serving', 'run', 'cypress:server:build'],
    ]);
    assert.deepEqual(getAdditionalE2EBuilds(packages, targets, 'build-coverage'), [
      ['--filter', '@odh-dashboard/model-serving', 'run', 'cypress:server:build:coverage'],
    ]);
    assert.deepEqual(getAdditionalE2EBuilds(packages, targets, 'dev'), []);
  });
});
