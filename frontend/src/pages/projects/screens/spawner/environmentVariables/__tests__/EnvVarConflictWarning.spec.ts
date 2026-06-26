import {
  EnvironmentVariableType,
  EnvVariable,
  SecretCategory,
  ConfigMapCategory,
} from '#~/pages/projects/types';
import { Connection } from '#~/concepts/connectionTypes/types';
import { findEnvVarConflicts } from '#~/pages/projects/screens/spawner/environmentVariables/EnvVarConflictWarning';

const mockConnection = (name: string, keys: string[]): Connection =>
  ({
    metadata: {
      name,
      namespace: 'test',
      annotations: { 'openshift.io/display-name': name },
      labels: { 'opendatahub.io/dashboard': 'true' },
    },
    data: Object.fromEntries(keys.map((k) => [k, btoa('val')])),
    kind: 'Secret',
    apiVersion: 'v1',
    type: 'Opaque',
  } as unknown as Connection);

describe('findEnvVarConflicts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when no env variables or connections', () => {
    expect(findEnvVarConflicts([], [])).toEqual([]);
  });

  it('should return empty array when no conflicts exist', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.EXISTING_SECRET,
        existingSecretRefs: [{ secretName: 's1', selectedKeys: ['A', 'B'], allKeys: true }],
      },
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.GENERIC, data: [{ key: 'C', value: 'v' }] },
      },
    ];
    expect(findEnvVarConflicts(envVars, [])).toEqual([]);
  });

  it('should detect conflicts between two existing secret refs', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.EXISTING_SECRET,
        existingSecretRefs: [
          { secretName: 's1', selectedKeys: ['SHARED_KEY', 'A'], allKeys: false },
          { secretName: 's2', selectedKeys: ['SHARED_KEY', 'B'], allKeys: false },
        ],
      },
    ];
    const conflicts = findEnvVarConflicts(envVars, []);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].key).toBe('SHARED_KEY');
    expect(conflicts[0].sources).toHaveLength(2);
  });

  it('should detect conflicts between existing secret ref and inline secret', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.EXISTING_SECRET,
        existingSecretRefs: [{ secretName: 's1', selectedKeys: ['DB_HOST'], allKeys: false }],
      },
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'inline-secret',
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'DB_HOST', value: 'localhost' }],
        },
      },
    ];
    const conflicts = findEnvVarConflicts(envVars, []);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].key).toBe('DB_HOST');
  });

  it('should detect conflicts between existing secret ref and connection', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.EXISTING_SECRET,
        existingSecretRefs: [
          { secretName: 's1', selectedKeys: ['AWS_ACCESS_KEY_ID'], allKeys: false },
        ],
      },
    ];
    const connections = [mockConnection('my-conn', ['AWS_ACCESS_KEY_ID', 'AWS_SECRET'])];
    const conflicts = findEnvVarConflicts(envVars, connections);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].key).toBe('AWS_ACCESS_KEY_ID');
  });

  it('should detect conflicts between inline secrets and connections', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.CONFIG_MAP,
        existingName: 'my-cm',
        values: {
          category: ConfigMapCategory.GENERIC,
          data: [{ key: 'TOKEN', value: 'abc' }],
        },
      },
    ];
    const connections = [mockConnection('c1', ['TOKEN'])];
    const conflicts = findEnvVarConflicts(envVars, connections);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].key).toBe('TOKEN');
  });

  it('should include AWS category secrets in conflict detection', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'aws-conn',
        values: {
          category: SecretCategory.AWS,
          data: [{ key: 'AWS_ACCESS_KEY_ID', value: 'x' }],
        },
      },
      {
        type: EnvironmentVariableType.EXISTING_SECRET,
        existingSecretRefs: [
          { secretName: 'ext', selectedKeys: ['AWS_ACCESS_KEY_ID'], allKeys: false },
        ],
      },
    ];
    const conflicts = findEnvVarConflicts(envVars, []);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].key).toBe('AWS_ACCESS_KEY_ID');
  });

  it('should detect multiple conflicts simultaneously', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.EXISTING_SECRET,
        existingSecretRefs: [
          { secretName: 's1', selectedKeys: ['X', 'Y'], allKeys: true },
          { secretName: 's2', selectedKeys: ['Y', 'Z'], allKeys: true },
        ],
      },
    ];
    const connections = [mockConnection('c1', ['X', 'Z'])];
    const conflicts = findEnvVarConflicts(envVars, connections);
    expect(conflicts).toHaveLength(3);
    expect(conflicts.map((c) => c.key).toSorted()).toEqual(['X', 'Y', 'Z']);
  });

  it('should skip existing secret refs with empty selectedKeys', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.EXISTING_SECRET,
        existingSecretRefs: [{ secretName: 's1', selectedKeys: [], allKeys: false }],
      },
    ];
    expect(findEnvVarConflicts(envVars, [])).toEqual([]);
  });

  it('should skip env vars with empty key strings', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: '', value: 'v' }],
        },
      },
    ];
    expect(findEnvVarConflicts(envVars, [])).toEqual([]);
  });
});
