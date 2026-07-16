import { EnvironmentVariableType, EnvVariable, SecretCategory } from '#~/pages/projects/types';
import { getExistingSecretEnvVars } from '#~/pages/projects/screens/spawner/service';

describe('getExistingSecretEnvVars', () => {
  it('should convert EXISTING category entries to EnvironmentVariable array', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 's3-credentials',
        values: {
          category: SecretCategory.EXISTING,
          data: [
            { key: 'AWS_ACCESS_KEY_ID', value: '' },
            { key: 'AWS_SECRET_ACCESS_KEY', value: '' },
          ],
        },
      },
    ];

    const result = getExistingSecretEnvVars(envVariables);

    expect(result).toEqual([
      {
        name: 'AWS_ACCESS_KEY_ID',
        valueFrom: { secretKeyRef: { name: 's3-credentials', key: 'AWS_ACCESS_KEY_ID' } },
      },
      {
        name: 'AWS_SECRET_ACCESS_KEY',
        valueFrom: { secretKeyRef: { name: 's3-credentials', key: 'AWS_SECRET_ACCESS_KEY' } },
      },
    ]);
  });

  it('should return empty array when no EXISTING entries exist', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'MY_VAR', value: 'my-value' }],
        },
      },
    ];

    expect(getExistingSecretEnvVars(envVariables)).toEqual([]);
  });

  it('should skip EXISTING entries without existingName', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: 'SOME_KEY', value: '' }],
        },
      },
    ];

    expect(getExistingSecretEnvVars(envVariables)).toEqual([]);
  });

  it('should handle multiple EXISTING entries from different secrets', () => {
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

    const result = getExistingSecretEnvVars(envVariables);

    expect(result).toEqual([
      { name: 'KEY_A', valueFrom: { secretKeyRef: { name: 'secret-a', key: 'KEY_A' } } },
      { name: 'KEY_B', valueFrom: { secretKeyRef: { name: 'secret-b', key: 'KEY_B' } } },
    ]);
  });
});
