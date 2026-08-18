const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { expandPattern } = require('../../query-workspace-packages');

describe('expandPattern', () => {
  it('throws for unsupported ** globs', () => {
    assert.throws(
      () => expandPattern('/repo', 'packages/**/frontend'),
      /Unsupported workspace glob/,
    );
  });
});
