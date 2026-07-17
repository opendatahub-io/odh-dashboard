import {
  ExistingSecretRef,
  EnvVariable,
  EnvironmentVariableType,
  SecretCategory,
} from '#~/pages/projects/types';
import { Connection } from '#~/concepts/connectionTypes/types';
import { detectExistingSecretCollisions } from '#~/pages/projects/screens/spawner/environmentVariables/existingSecretConflicts';

describe('detectExistingSecretCollisions', () => {
  it('should return empty array when no collisions exist', () => {
    const refs: ExistingSecretRef[] = [
      { secretName: 'secret-a', selectedKeys: ['KEY_A'], allKeys: ['KEY_A'] },
      { secretName: 'secret-b', selectedKeys: ['KEY_B'], allKeys: ['KEY_B'] },
    ];
    expect(detectExistingSecretCollisions(refs, [], [])).toStrictEqual([]);
  });

  it('should detect collisions between two existing secrets', () => {
    const refs: ExistingSecretRef[] = [
      {
        secretName: 'secret-a',
        selectedKeys: ['SHARED_KEY', 'KEY_A'],
        allKeys: ['SHARED_KEY', 'KEY_A'],
      },
      {
        secretName: 'secret-b',
        selectedKeys: ['SHARED_KEY', 'KEY_B'],
        allKeys: ['SHARED_KEY', 'KEY_B'],
      },
    ];
    const result = detectExistingSecretCollisions(refs, [], []);
    expect(result).toHaveLength(1);
    expect(result[0].keyName).toBe('SHARED_KEY');
    expect(result[0].sources).toHaveLength(2);
  });

  it('should detect collisions between existing secret and inline env var', () => {
    const refs: ExistingSecretRef[] = [
      { secretName: 'secret-a', selectedKeys: ['DB_PASSWORD'], allKeys: ['DB_PASSWORD'] },
    ];
    const inlineVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'DB_PASSWORD', value: 'inline-value' }],
        },
      },
    ];
    const result = detectExistingSecretCollisions(refs, inlineVars, []);
    expect(result).toHaveLength(1);
    expect(result[0].keyName).toBe('DB_PASSWORD');
  });

  it('should detect collisions between existing secret and connection keys', () => {
    const refs: ExistingSecretRef[] = [
      {
        secretName: 'secret-a',
        selectedKeys: ['AWS_ACCESS_KEY_ID'],
        allKeys: ['AWS_ACCESS_KEY_ID'],
      },
    ];
    const connections = [
      {
        metadata: { name: 'my-conn', namespace: 'ns' },
        data: { AWS_ACCESS_KEY_ID: 'encoded-val' },
      },
    ] as unknown as Connection[];
    const result = detectExistingSecretCollisions(refs, [], connections);
    expect(result).toHaveLength(1);
    expect(result[0].keyName).toBe('AWS_ACCESS_KEY_ID');
  });

  it('should return empty when existing secrets have no selected keys', () => {
    const refs: ExistingSecretRef[] = [
      { secretName: 'secret-a', selectedKeys: [], allKeys: ['KEY_A'] },
    ];
    expect(detectExistingSecretCollisions(refs, [], [])).toStrictEqual([]);
  });

  it('should detect three-way collision between existing secret, inline, and connection', () => {
    const refs: ExistingSecretRef[] = [
      { secretName: 'secret-a', selectedKeys: ['SHARED_KEY'], allKeys: ['SHARED_KEY'] },
    ];
    const inlineVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'SHARED_KEY', value: 'inline-val' }],
        },
      },
    ];
    const connections = [
      {
        metadata: { name: 'my-conn', namespace: 'ns' },
        data: { SHARED_KEY: 'conn-val' },
      },
    ] as unknown as Connection[];
    const result = detectExistingSecretCollisions(refs, inlineVars, connections);
    expect(result).toHaveLength(1);
    expect(result[0].keyName).toBe('SHARED_KEY');
    expect(result[0].sources).toHaveLength(3);
    expect(result[0].sources.map((s) => s.type).toSorted()).toStrictEqual([
      'connection',
      'existing-secret',
      'inline',
    ]);
  });

  it('should not double-count EXISTING-type inlineEnvVars already covered by existingSecretRefs', () => {
    const refs: ExistingSecretRef[] = [
      { secretName: 'secret-a', selectedKeys: ['MY_KEY'], allKeys: ['MY_KEY'] },
    ];
    const inlineVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.EXISTING,
          data: [],
        },
        existingSecrets: [
          { secretName: 'secret-a', selectedKeys: ['MY_KEY'], allKeys: ['MY_KEY'] },
        ],
      },
    ];
    const result = detectExistingSecretCollisions(refs, inlineVars, []);
    expect(result).toStrictEqual([]);
  });

  it('should not detect collision for deselected keys', () => {
    const refs: ExistingSecretRef[] = [
      { secretName: 'secret-a', selectedKeys: ['KEY_A'], allKeys: ['KEY_A', 'SHARED'] },
      { secretName: 'secret-b', selectedKeys: ['KEY_B'], allKeys: ['KEY_B', 'SHARED'] },
    ];
    expect(detectExistingSecretCollisions(refs, [], [])).toStrictEqual([]);
  });
});
