import {
  EnvVariable,
  EnvironmentVariableType,
  SecretCategory,
  ConfigMapCategory,
} from '#~/pages/projects/types';
import { detectEnvVarConflicts } from '#~/pages/projects/screens/spawner/environmentVariables/envVarConflicts';

describe('detectEnvVarConflicts', () => {
  it('should return empty array when no conflicts', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'secret-a',
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: 'KEY_A', value: '' }],
        },
      },
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'secret-b',
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: 'KEY_B', value: '' }],
        },
      },
    ];

    expect(detectEnvVarConflicts(envVariables, new Map())).toEqual([]);
  });

  it('should detect conflict between two existing secrets', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'secret-a',
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: 'DB_HOST', value: '' }],
        },
      },
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'secret-b',
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: 'DB_HOST', value: '' }],
        },
      },
    ];

    const conflicts = detectEnvVarConflicts(envVariables, new Map());
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].key).toBe('DB_HOST');
    expect(conflicts[0].sources).toContain("Secret 'secret-a'");
    expect(conflicts[0].sources).toContain("Secret 'secret-b'");
  });

  it('should detect conflict between existing secret and inline secret', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'my-secret',
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: 'API_KEY', value: '' }],
        },
      },
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'inline-secret',
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'API_KEY', value: 'some-value' }],
        },
      },
    ];

    const conflicts = detectEnvVarConflicts(envVariables, new Map());
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].key).toBe('API_KEY');
  });

  it('should detect conflict between existing secret and connection', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'my-secret',
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: 'AWS_ACCESS_KEY_ID', value: '' }],
        },
      },
    ];

    const connectionKeys = new Map([['My S3 Connection', ['AWS_ACCESS_KEY_ID', 'AWS_SECRET']]]);

    const conflicts = detectEnvVarConflicts(envVariables, connectionKeys);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].key).toBe('AWS_ACCESS_KEY_ID');
    expect(conflicts[0].sources).toContain("Secret 'my-secret'");
    expect(conflicts[0].sources).toContain("Connection 'My S3 Connection'");
  });

  it('should handle config map entries', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'my-secret',
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: 'CONFIG_VAL', value: '' }],
        },
      },
      {
        type: EnvironmentVariableType.CONFIG_MAP,
        existingName: 'my-cm',
        values: {
          category: ConfigMapCategory.GENERIC,
          data: [{ key: 'CONFIG_VAL', value: 'some-val' }],
        },
      },
    ];

    const conflicts = detectEnvVarConflicts(envVariables, new Map());
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].key).toBe('CONFIG_VAL');
  });

  it('should return empty array when envVariables is empty', () => {
    expect(detectEnvVarConflicts([], new Map())).toEqual([]);
  });

  it('should skip entries with missing data', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'secret-a',
        values: undefined,
      },
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'secret-b',
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: 'KEY_A', value: '' }],
        },
      },
    ];

    expect(detectEnvVarConflicts(envVariables, new Map())).toEqual([]);
  });

  it('should skip entries with empty key', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'secret-a',
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: '', value: 'val' }],
        },
      },
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'secret-b',
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: '', value: 'other-val' }],
        },
      },
    ];

    expect(detectEnvVarConflicts(envVariables, new Map())).toEqual([]);
  });

  it('should use correct source labels for different categories', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'my-existing',
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: 'SHARED_KEY', value: '' }],
        },
      },
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'my-inline',
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'SHARED_KEY', value: 'val' }],
        },
      },
    ];

    const conflicts = detectEnvVarConflicts(envVariables, new Map());
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].sources).toContain("Secret 'my-existing'");
    expect(conflicts[0].sources).toContain("Environment variable 'my-inline'");
  });

  it('should use fallback labels when existingName is missing', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'MY_KEY', value: 'a' }],
        },
      },
      {
        type: EnvironmentVariableType.CONFIG_MAP,
        values: {
          category: ConfigMapCategory.GENERIC,
          data: [{ key: 'MY_KEY', value: 'b' }],
        },
      },
    ];

    const conflicts = detectEnvVarConflicts(envVariables, new Map());
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].sources).toContain("Environment variable 'New secret'");
    expect(conflicts[0].sources).toContain("Environment variable 'New config map'");
  });

  it('should detect multiple conflicts', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'secret-a',
        values: {
          category: SecretCategory.EXISTING,
          data: [
            { key: 'KEY_1', value: '' },
            { key: 'KEY_2', value: '' },
          ],
        },
      },
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'secret-b',
        values: {
          category: SecretCategory.EXISTING,
          data: [
            { key: 'KEY_1', value: '' },
            { key: 'KEY_2', value: '' },
          ],
        },
      },
    ];

    const conflicts = detectEnvVarConflicts(envVariables, new Map());
    expect(conflicts).toHaveLength(2);
    expect(conflicts.map((c) => c.key)).toContain('KEY_1');
    expect(conflicts.map((c) => c.key)).toContain('KEY_2');
  });

  it('should detect conflict across three sources', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'secret-a',
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: 'SHARED', value: '' }],
        },
      },
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'secret-b',
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'SHARED', value: 'val' }],
        },
      },
    ];

    const connectionKeys = new Map([['My Connection', ['SHARED']]]);

    const conflicts = detectEnvVarConflicts(envVariables, connectionKeys);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].sources).toHaveLength(3);
    expect(conflicts[0].sources).toContain("Secret 'secret-a'");
    expect(conflicts[0].sources).toContain("Environment variable 'secret-b'");
    expect(conflicts[0].sources).toContain("Connection 'My Connection'");
  });
});
