import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getExactDatabaseOptionRegex } from './autoragDatabaseOptionRegex';

describe('getExactDatabaseOptionRegex', () => {
  it('matches each known provider with adjacent or whitespace-separated labels', () => {
    const matcher = getExactDatabaseOptionRegex('db');

    for (const provider of ['Milvus', 'PGVector', 'Neo4j']) {
      assert.equal(matcher.test(`db${provider}`), true);
      assert.equal(matcher.test(`db ${provider}`), true);
    }
  });

  it('avoids connection-name collisions and unknown providers', () => {
    const matcher = getExactDatabaseOptionRegex('db');

    assert.equal(matcher.test('db-production'), false);
    assert.equal(matcher.test('dbRedis'), false);
    assert.equal(matcher.test('db PGVectorExtra'), false);
  });

  it('preserves every character in the connection name', () => {
    const matcher = getExactDatabaseOptionRegex('db  name ');

    assert.equal(matcher.test('db  name  Neo4j'), true);
    assert.equal(matcher.test('db name Neo4j'), false);
    assert.equal(matcher.test('db  name'), false);
  });

  it('escapes regex metacharacters in the connection name', () => {
    const matcher = getExactDatabaseOptionRegex('db.(prod)+[x]');

    assert.equal(matcher.test('db.(prod)+[x] PGVector'), true);
    assert.equal(matcher.test('dbX(prod)Y+[x] PGVector'), false);
  });
});
