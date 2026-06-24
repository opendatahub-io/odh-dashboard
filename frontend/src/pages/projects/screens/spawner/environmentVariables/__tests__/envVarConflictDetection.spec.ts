import {
  ExistingSecretRef,
  EnvVariable,
  EnvironmentVariableType,
  SecretCategory,
} from '#~/pages/projects/types';
import { detectEnvVarConflicts } from '#~/pages/projects/screens/spawner/environmentVariables/envVarConflictDetection';

describe('detectEnvVarConflicts', () => {
  it('should return empty array when there are no conflicts', () => {
    const existingSecretRefs: ExistingSecretRef[] = [
      { secretName: 'secret-a', selectedKeys: ['KEY_A'], allKeys: false },
    ];
    const inlineEnvVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'KEY_B', value: 'val' }],
        },
      },
    ];
    const connectionKeys = ['KEY_C'];

    const result = detectEnvVarConflicts(existingSecretRefs, inlineEnvVars, connectionKeys);

    expect(result).toEqual([]);
  });

  it('should detect conflict between two existing secrets with the same key', () => {
    const existingSecretRefs: ExistingSecretRef[] = [
      { secretName: 'secret-a', selectedKeys: ['SHARED_KEY'], allKeys: false },
      { secretName: 'secret-b', selectedKeys: ['SHARED_KEY'], allKeys: false },
    ];

    const result = detectEnvVarConflicts(existingSecretRefs, [], []);

    expect(result).toEqual([
      {
        key: 'SHARED_KEY',
        sources: expect.arrayContaining(['secret-a', 'secret-b']),
      },
    ]);
    expect(result).toHaveLength(1);
  });

  it('should detect conflict between existing secret key and inline secret key', () => {
    const existingSecretRefs: ExistingSecretRef[] = [
      { secretName: 'my-secret', selectedKeys: ['DB_PASSWORD'], allKeys: false },
    ];
    const inlineEnvVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'DB_PASSWORD', value: 'inline-val' }],
        },
      },
    ];

    const result = detectEnvVarConflicts(existingSecretRefs, inlineEnvVars, []);

    expect(result).toEqual([
      {
        key: 'DB_PASSWORD',
        sources: expect.arrayContaining(['my-secret', 'Inline variable']),
      },
    ]);
    expect(result).toHaveLength(1);
  });

  it('should detect conflict between existing secret key and Connection key', () => {
    const existingSecretRefs: ExistingSecretRef[] = [
      { secretName: 'my-secret', selectedKeys: ['API_KEY'], allKeys: false },
    ];

    const result = detectEnvVarConflicts(existingSecretRefs, [], ['API_KEY']);

    expect(result).toEqual([
      {
        key: 'API_KEY',
        sources: expect.arrayContaining(['my-secret', 'Connection']),
      },
    ]);
    expect(result).toHaveLength(1);
  });

  it('should return all conflicts when multiple collisions exist', () => {
    const existingSecretRefs: ExistingSecretRef[] = [
      { secretName: 'secret-a', selectedKeys: ['KEY_1', 'KEY_2'], allKeys: false },
      { secretName: 'secret-b', selectedKeys: ['KEY_1'], allKeys: false },
    ];
    const inlineEnvVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.GENERIC,
          data: [
            { key: 'KEY_2', value: 'val' },
            { key: 'KEY_3', value: 'val3' },
          ],
        },
      },
    ];
    const connectionKeys = ['KEY_3', 'KEY_1'];

    const result = detectEnvVarConflicts(existingSecretRefs, inlineEnvVars, connectionKeys);

    expect(result).toHaveLength(3);
    const conflictKeys = result.map((c) => c.key).toSorted();
    expect(conflictKeys).toEqual(['KEY_1', 'KEY_2', 'KEY_3']);

    const key1Conflict = result.find((c) => c.key === 'KEY_1');
    expect(key1Conflict?.sources).toHaveLength(3);
    expect(key1Conflict?.sources).toEqual(
      expect.arrayContaining(['secret-a', 'secret-b', 'Connection']),
    );
  });

  it('should return empty array when no keys exist at all', () => {
    const result = detectEnvVarConflicts([], [], []);
    expect(result).toEqual([]);
  });

  it('should return empty array when all keys differ across sources', () => {
    const existingSecretRefs: ExistingSecretRef[] = [
      { secretName: 'secret-a', selectedKeys: ['ALPHA'], allKeys: false },
    ];
    const inlineEnvVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'BRAVO', value: 'val' }],
        },
      },
    ];
    const connectionKeys = ['CHARLIE'];

    const result = detectEnvVarConflicts(existingSecretRefs, inlineEnvVars, connectionKeys);

    expect(result).toEqual([]);
  });

  it('should handle inline env vars without values gracefully', () => {
    const inlineEnvVars: EnvVariable[] = [{ type: EnvironmentVariableType.SECRET }, { type: null }];

    const result = detectEnvVarConflicts([], inlineEnvVars, []);
    expect(result).toEqual([]);
  });
});
