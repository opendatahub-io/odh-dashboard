import { ExistingSecretRef } from '#~/pages/projects/types';
import {
  detectExistingSecretKeyCollisions,
  getCollidingKeySet,
} from '#~/pages/projects/screens/spawner/environmentVariables/existingSecretCollisions';

describe('detectExistingSecretKeyCollisions', () => {
  it('should return empty array when no refs are provided', () => {
    expect(detectExistingSecretKeyCollisions([])).toEqual([]);
  });

  it('should return empty array when a single secret is selected', () => {
    const refs: ExistingSecretRef[] = [{ secretName: 'secret-a', selectedKeys: ['key1', 'key2'] }];
    expect(detectExistingSecretKeyCollisions(refs)).toEqual([]);
  });

  it('should return empty array when no keys overlap across secrets', () => {
    const refs: ExistingSecretRef[] = [
      { secretName: 'secret-a', selectedKeys: ['key1', 'key2'] },
      { secretName: 'secret-b', selectedKeys: ['key3', 'key4'] },
    ];
    expect(detectExistingSecretKeyCollisions(refs)).toEqual([]);
  });

  it('should detect a single collision between two secrets', () => {
    const refs: ExistingSecretRef[] = [
      { secretName: 'aws-training-creds', selectedKeys: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET'] },
      { secretName: 's3-readonly', selectedKeys: ['AWS_ACCESS_KEY_ID', 'BUCKET_NAME'] },
    ];
    const collisions = detectExistingSecretKeyCollisions(refs);
    expect(collisions).toEqual([
      { key: 'AWS_ACCESS_KEY_ID', sources: ['aws-training-creds', 's3-readonly'] },
    ]);
  });

  it('should detect multiple collisions across secrets', () => {
    const refs: ExistingSecretRef[] = [
      { secretName: 'secret-a', selectedKeys: ['DB_HOST', 'DB_PORT', 'DB_USER'] },
      { secretName: 'secret-b', selectedKeys: ['DB_HOST', 'DB_USER', 'DB_NAME'] },
    ];
    const collisions = detectExistingSecretKeyCollisions(refs);
    expect(collisions).toHaveLength(2);
    expect(collisions).toEqual(
      expect.arrayContaining([
        { key: 'DB_HOST', sources: ['secret-a', 'secret-b'] },
        { key: 'DB_USER', sources: ['secret-a', 'secret-b'] },
      ]),
    );
  });

  it('should detect collisions across three secrets', () => {
    const refs: ExistingSecretRef[] = [
      { secretName: 'secret-a', selectedKeys: ['SHARED_KEY'] },
      { secretName: 'secret-b', selectedKeys: ['SHARED_KEY'] },
      { secretName: 'secret-c', selectedKeys: ['SHARED_KEY'] },
    ];
    const collisions = detectExistingSecretKeyCollisions(refs);
    expect(collisions).toEqual([
      { key: 'SHARED_KEY', sources: ['secret-a', 'secret-b', 'secret-c'] },
    ]);
  });

  it('should return empty array when secrets have no selected keys', () => {
    const refs: ExistingSecretRef[] = [
      { secretName: 'secret-a', selectedKeys: [] },
      { secretName: 'secret-b', selectedKeys: [] },
    ];
    expect(detectExistingSecretKeyCollisions(refs)).toEqual([]);
  });

  it('should detect collision with external key names', () => {
    const refs: ExistingSecretRef[] = [
      { secretName: 'my-secret', selectedKeys: ['DB_HOST', 'DB_PORT'] },
    ];
    const externalKeys = new Set(['DB_HOST']);
    const result = detectExistingSecretKeyCollisions(refs, externalKeys);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('DB_HOST');
    expect(result[0].sources).toContain('another variable');
  });

  it('should not report collision when external key does not overlap', () => {
    const refs: ExistingSecretRef[] = [{ secretName: 'my-secret', selectedKeys: ['DB_HOST'] }];
    const externalKeys = new Set(['UNRELATED_KEY']);
    expect(detectExistingSecretKeyCollisions(refs, externalKeys)).toEqual([]);
  });

  it('should report both cross-secret and external collisions', () => {
    const refs: ExistingSecretRef[] = [
      { secretName: 'secret-a', selectedKeys: ['SHARED', 'UNIQUE_A'] },
      { secretName: 'secret-b', selectedKeys: ['SHARED'] },
    ];
    const externalKeys = new Set(['UNIQUE_A']);
    const result = detectExistingSecretKeyCollisions(refs, externalKeys);
    expect(result).toHaveLength(2);
    expect(result.find((c) => c.key === 'SHARED')?.sources).toEqual(['secret-a', 'secret-b']);
    expect(result.find((c) => c.key === 'UNIQUE_A')?.sources).toContain('another variable');
  });

  it('should detect cross-row existing-secret collisions via externalKeyNames', () => {
    const refs: ExistingSecretRef[] = [
      { secretName: 'secret-a', selectedKeys: ['DB_HOST', 'DB_PORT'] },
    ];
    const otherRowKeys = new Set(['DB_HOST', 'API_KEY']);
    const result = detectExistingSecretKeyCollisions(refs, otherRowKeys);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('DB_HOST');
    expect(result[0].sources).toContain('secret-a');
    expect(result[0].sources).toContain('another variable');
  });

  it('should deduplicate same-secret sources using Set', () => {
    const refs: ExistingSecretRef[] = [
      { secretName: 'secret-a', selectedKeys: ['KEY'] },
      { secretName: 'secret-a', selectedKeys: ['KEY'] },
    ];
    const result = detectExistingSecretKeyCollisions(refs);
    expect(result).toHaveLength(0);
  });
});

describe('getCollidingKeySet', () => {
  it('should return empty set when no collisions', () => {
    expect(getCollidingKeySet([])).toEqual(new Set());
  });

  it('should return set of colliding key names', () => {
    const collisions = [
      { key: 'DB_HOST', sources: ['secret-a', 'secret-b'] },
      { key: 'DB_USER', sources: ['secret-a', 'secret-b'] },
    ];
    const result = getCollidingKeySet(collisions);
    expect(result).toEqual(new Set(['DB_HOST', 'DB_USER']));
  });
});
