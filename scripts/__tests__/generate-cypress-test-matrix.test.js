const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { MAX_TEST_SHARDS, createTestShards } = require('../generate-cypress-test-matrix');

const groups = [
  { name: 'alpha', spec: 'alpha.cy.ts', size: 100 },
  { name: 'bravo', spec: 'bravo.cy.ts', size: 90 },
  { name: 'charlie', spec: 'charlie.cy.ts', size: 80 },
  { name: 'delta', spec: 'delta.cy.ts', size: 70 },
  { name: 'echo', spec: 'echo.cy.ts', size: 60 },
  { name: 'foxtrot', spec: 'foxtrot.cy.ts', size: 50 },
];

describe('createTestShards', () => {
  it('caps the matrix and includes every discovered group exactly once', () => {
    const shards = createTestShards(groups, 3);

    assert.equal(shards.length, 3);
    assert.deepEqual(
      shards.flatMap((shard) => shard.spec.split(',')).toSorted(),
      groups.map((group) => group.spec).toSorted(),
    );
  });

  it('is deterministic regardless of discovery order', () => {
    assert.deepEqual(createTestShards(groups, 3), createTestShards([...groups].reverse(), 3));
  });

  it('does not create empty shards when there are fewer groups than the cap', () => {
    const shards = createTestShards(groups.slice(0, 2));

    assert.equal(shards.length, 2);
    assert.ok(shards.length <= MAX_TEST_SHARDS);
  });

  it('rejects an invalid shard cap', () => {
    assert.throws(() => createTestShards(groups, 0), /positive integer/);
  });
});
