import { EnvVariable, EnvironmentVariableType, SecretCategory } from '#~/pages/projects/types';
import { getEnvVarsForExistingSecrets } from '#~/pages/projects/screens/spawner/service';

describe('getEnvVarsForExistingSecrets', () => {
  it('should return empty array when no existing secret variables', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'my-secret',
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'KEY1', value: 'val1' }],
        },
      },
    ];
    expect(getEnvVarsForExistingSecrets(envVariables)).toEqual([]);
  });

  it('should convert existing secret entries to secretKeyRef format', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'db-credentials',
        values: {
          category: SecretCategory.EXISTING,
          data: [
            { key: 'DB_HOST', value: '' },
            { key: 'DB_PASSWORD', value: '' },
          ],
        },
      },
    ];

    const result = getEnvVarsForExistingSecrets(envVariables);
    expect(result).toEqual([
      {
        name: 'DB_HOST',
        valueFrom: { secretKeyRef: { name: 'db-credentials', key: 'DB_HOST' } },
      },
      {
        name: 'DB_PASSWORD',
        valueFrom: { secretKeyRef: { name: 'db-credentials', key: 'DB_PASSWORD' } },
      },
    ]);
  });

  it('should handle multiple existing secrets', () => {
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

    const result = getEnvVarsForExistingSecrets(envVariables);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('KEY_A');
    expect(result[1].name).toBe('KEY_B');
  });

  it('should skip entries without existingName', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: 'KEY', value: '' }],
        },
      },
    ];

    expect(getEnvVarsForExistingSecrets(envVariables)).toEqual([]);
  });

  it('should skip entries with empty key', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'my-secret',
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: '', value: '' }],
        },
      },
    ];

    expect(getEnvVarsForExistingSecrets(envVariables)).toEqual([]);
  });

  it('should filter mixed variables and only return existing secret entries', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'generic-secret',
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'KEY1', value: 'val1' }],
        },
      },
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'existing-secret',
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: 'EXISTING_KEY', value: '' }],
        },
      },
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'aws-secret',
        values: {
          category: SecretCategory.AWS,
          data: [{ key: 'AWS_KEY', value: 'aws-val' }],
        },
      },
    ];

    const result = getEnvVarsForExistingSecrets(envVariables);
    expect(result).toEqual([
      {
        name: 'EXISTING_KEY',
        valueFrom: { secretKeyRef: { name: 'existing-secret', key: 'EXISTING_KEY' } },
      },
    ]);
  });

  it('should return empty array for empty input', () => {
    expect(getEnvVarsForExistingSecrets([])).toEqual([]);
  });

  it('should skip entries without values', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'my-secret',
      },
    ];

    expect(getEnvVarsForExistingSecrets(envVariables)).toEqual([]);
  });
});
