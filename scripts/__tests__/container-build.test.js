const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');

describe('dashboard container build', () => {
  it('runs build tools on the build platform and leaves the runtime on the target platform', () => {
    const dockerfile = readFileSync(path.join(ROOT, 'Dockerfile'), 'utf8');

    assert.deepEqual(dockerfile.match(/^FROM .+$/gm), [
      'FROM --platform=$BUILDPLATFORM ${BASE_IMAGE} AS builder',
      'FROM ${MINIMAL_IMAGE} AS runtime',
    ]);
  });

  it('uses the main Dockerfile for buildx without rewriting platform flags', () => {
    const output = execFileSync(
      'make',
      [
        '--dry-run',
        'docker-buildx',
        'PLATFORMS=linux/amd64,linux/arm64',
        'IMAGE_REPOSITORY=dashboard:test',
      ],
      { cwd: ROOT, encoding: 'utf8' },
    );

    assert.match(
      output,
      /docker buildx build --push --platform=linux\/amd64,linux\/arm64 --tag dashboard:test -f Dockerfile \./,
    );
    assert.doesNotMatch(output, /Dockerfile\.cross|sed /);
  });
});
