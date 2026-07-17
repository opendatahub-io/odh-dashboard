import {
  EnvVariable,
  EnvironmentVariableType,
  SecretCategory,
  ConfigMapCategory,
} from '#~/pages/projects/types';

import { buildExistingSecretEnvVars } from '#~/pages/projects/screens/spawner/service';

describe('buildExistingSecretEnvVars', () => {
  it('should transform EnvVariable with existingSecrets to ExistingSecretEnvVar array', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.EXISTING, data: [] },
        existingSecrets: [
          {
            secretName: 'my-secret',
            selectedKeys: ['KEY_A', 'KEY_B'],
            allKeys: ['KEY_A', 'KEY_B', 'KEY_C'],
          },
        ],
      },
    ];
    const result = buildExistingSecretEnvVars(envVars);
    expect(result).toStrictEqual([
      { name: 'KEY_A', secretName: 'my-secret', key: 'KEY_A' },
      { name: 'KEY_B', secretName: 'my-secret', key: 'KEY_B' },
    ]);
  });

  it('should handle multiple secrets across multiple env blocks', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.EXISTING, data: [] },
        existingSecrets: [
          { secretName: 'secret-a', selectedKeys: ['A1'], allKeys: ['A1'] },
          { secretName: 'secret-b', selectedKeys: ['B1', 'B2'], allKeys: ['B1', 'B2'] },
        ],
      },
    ];
    const result = buildExistingSecretEnvVars(envVars);
    expect(result).toHaveLength(3);
    expect(result[0]).toStrictEqual({ name: 'A1', secretName: 'secret-a', key: 'A1' });
    expect(result[1]).toStrictEqual({ name: 'B1', secretName: 'secret-b', key: 'B1' });
    expect(result[2]).toStrictEqual({ name: 'B2', secretName: 'secret-b', key: 'B2' });
  });

  it('should return empty array when no EXISTING category env vars', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'K', value: 'V' }],
        },
      },
    ];
    expect(buildExistingSecretEnvVars(envVars)).toStrictEqual([]);
  });

  it('should return empty array when existingSecrets is undefined', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.EXISTING, data: [] },
      },
    ];
    expect(buildExistingSecretEnvVars(envVars)).toStrictEqual([]);
  });

  it('should skip non-secret env variables', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.CONFIG_MAP,
        values: {
          category: ConfigMapCategory.GENERIC,
          data: [{ key: 'CM_KEY', value: 'cm_val' }],
        },
      },
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.EXISTING, data: [] },
        existingSecrets: [{ secretName: 's1', selectedKeys: ['X'], allKeys: ['X'] }],
      },
    ];
    const result = buildExistingSecretEnvVars(envVars);
    expect(result).toStrictEqual([{ name: 'X', secretName: 's1', key: 'X' }]);
  });
});
