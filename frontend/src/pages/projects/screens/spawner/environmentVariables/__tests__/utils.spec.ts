import { Connection } from '#~/concepts/connectionTypes/types';
import { EnvVariable, SecretCategory } from '#~/pages/projects/types';
import { detectEnvVarConflicts } from '#~/pages/projects/screens/spawner/environmentVariables/utils';

const createEnvVariable = (
  category: SecretCategory,
  keys: string[],
  secretName?: string,
): EnvVariable => ({
  type: null,
  values: {
    category,
    data: keys.map((key) => ({ key, value: 'test-value' })),
    secretName,
  },
});

const createConnection = (name: string, keys: string[]): Connection => ({
  apiVersion: 'v1',
  kind: 'Secret',
  type: 'Opaque',
  metadata: {
    name,
    namespace: 'test',
    labels: {
      'opendatahub.io/dashboard': 'true',
    },
    annotations: {
      'openshift.io/display-name': `${name} Display`,
    },
  },
  data: keys.reduce((acc, key) => ({ ...acc, [key]: 'dGVzdC12YWx1ZQ==' }), {}),
});

describe('detectEnvVarConflicts', () => {
  it('should return empty array when there are no conflicts', () => {
    const envVariables: EnvVariable[] = [
      createEnvVariable(SecretCategory.GENERIC, ['KEY1', 'KEY2']),
      createEnvVariable(SecretCategory.EXISTING, ['KEY3', 'KEY4'], 'secret1'),
    ];
    const connections: Connection[] = [createConnection('conn1', ['KEY5', 'KEY6'])];

    const conflicts = detectEnvVarConflicts(envVariables, connections);

    expect(conflicts).toEqual([]);
  });

  it('should detect collision between inline secret and existing secret', () => {
    const envVariables: EnvVariable[] = [
      createEnvVariable(SecretCategory.GENERIC, ['KEY1', 'KEY2']),
      createEnvVariable(SecretCategory.EXISTING, ['KEY2', 'KEY3'], 'secret1'),
    ];
    const connections: Connection[] = [];

    const conflicts = detectEnvVarConflicts(envVariables, connections);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toEqual({
      source1: 'Inline secret',
      source2: 'secret1',
      keys: ['KEY2'],
    });
  });

  it('should detect collision between two existing secrets', () => {
    const envVariables: EnvVariable[] = [
      createEnvVariable(SecretCategory.EXISTING, ['KEY1', 'KEY2'], 'secret1'),
      createEnvVariable(SecretCategory.EXISTING, ['KEY2', 'KEY3'], 'secret2'),
    ];
    const connections: Connection[] = [];

    const conflicts = detectEnvVarConflicts(envVariables, connections);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toEqual({
      source1: 'secret1',
      source2: 'secret2',
      keys: ['KEY2'],
    });
  });

  it('should detect collision between existing secret and Connection', () => {
    const envVariables: EnvVariable[] = [
      createEnvVariable(SecretCategory.EXISTING, ['KEY1', 'KEY2'], 'secret1'),
    ];
    const connections: Connection[] = [createConnection('conn1', ['KEY2', 'KEY3'])];

    const conflicts = detectEnvVarConflicts(envVariables, connections);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toEqual({
      source1: 'secret1',
      source2: 'conn1 Display',
      keys: ['KEY2'],
    });
  });

  it('should detect collision between inline secret and Connection', () => {
    const envVariables: EnvVariable[] = [
      createEnvVariable(SecretCategory.UPLOAD, ['KEY1', 'KEY2']),
    ];
    const connections: Connection[] = [createConnection('conn1', ['KEY2', 'KEY3'])];

    const conflicts = detectEnvVarConflicts(envVariables, connections);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toEqual({
      source1: 'Inline secret',
      source2: 'conn1 Display',
      keys: ['KEY2'],
    });
  });

  it('should detect multiple conflicts', () => {
    const envVariables: EnvVariable[] = [
      createEnvVariable(SecretCategory.GENERIC, ['KEY1', 'KEY2']),
      createEnvVariable(SecretCategory.EXISTING, ['KEY2', 'KEY3'], 'secret1'),
      createEnvVariable(SecretCategory.EXISTING, ['KEY3', 'KEY4'], 'secret2'),
    ];
    const connections: Connection[] = [createConnection('conn1', ['KEY4', 'KEY5'])];

    const conflicts = detectEnvVarConflicts(envVariables, connections);

    expect(conflicts).toHaveLength(3);
    expect(conflicts).toContainEqual({
      source1: 'Inline secret',
      source2: 'secret1',
      keys: ['KEY2'],
    });
    expect(conflicts).toContainEqual({
      source1: 'secret1',
      source2: 'secret2',
      keys: ['KEY3'],
    });
    expect(conflicts).toContainEqual({
      source1: 'secret2',
      source2: 'conn1 Display',
      keys: ['KEY4'],
    });
  });

  it('should detect multiple colliding keys in a single conflict', () => {
    const envVariables: EnvVariable[] = [
      createEnvVariable(SecretCategory.GENERIC, ['KEY1', 'KEY2', 'KEY3']),
      createEnvVariable(SecretCategory.EXISTING, ['KEY2', 'KEY3', 'KEY4'], 'secret1'),
    ];
    const connections: Connection[] = [];

    const conflicts = detectEnvVarConflicts(envVariables, connections);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toEqual({
      source1: 'Inline secret',
      source2: 'secret1',
      keys: ['KEY2', 'KEY3'],
    });
  });

  it('should handle empty env variables and connections', () => {
    const conflicts = detectEnvVarConflicts([], []);

    expect(conflicts).toEqual([]);
  });

  it('should handle env variables without values', () => {
    const envVariables: EnvVariable[] = [
      { type: null },
      createEnvVariable(SecretCategory.GENERIC, ['KEY1']),
    ];
    const connections: Connection[] = [];

    const conflicts = detectEnvVarConflicts(envVariables, connections);

    expect(conflicts).toEqual([]);
  });

  it('should handle connections without data', () => {
    const envVariables: EnvVariable[] = [createEnvVariable(SecretCategory.GENERIC, ['KEY1'])];
    const connections: Connection[] = [
      {
        apiVersion: 'v1',
        kind: 'Secret',
        type: 'Opaque',
        metadata: {
          name: 'conn1',
          namespace: 'test',
          labels: { 'opendatahub.io/dashboard': 'true' },
          annotations: { 'openshift.io/display-name': 'conn1 Display' },
        },
      },
    ];

    const conflicts = detectEnvVarConflicts(envVariables, connections);

    expect(conflicts).toEqual([]);
  });
});
