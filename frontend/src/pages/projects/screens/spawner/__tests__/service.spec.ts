import { EnvVariable, EnvironmentVariableType, SecretCategory } from '#~/pages/projects/types';
import { buildExistingSecretEnvVars } from '#~/pages/projects/screens/spawner/service';

describe('buildExistingSecretEnvVars', () => {
  it('should build env vars from existing secret entries', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'my-secret',
        values: {
          category: SecretCategory.EXISTING,
          data: [
            { key: 'API_KEY', value: '' },
            { key: 'DB_PASSWORD', value: '' },
          ],
        },
      },
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'another-secret',
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: 'TOKEN', value: '' }],
        },
      },
    ];

    const result = buildExistingSecretEnvVars(envVariables);

    expect(result).toEqual([
      {
        name: 'API_KEY',
        valueFrom: {
          secretKeyRef: {
            name: 'my-secret',
            key: 'API_KEY',
          },
        },
      },
      {
        name: 'DB_PASSWORD',
        valueFrom: {
          secretKeyRef: {
            name: 'my-secret',
            key: 'DB_PASSWORD',
          },
        },
      },
      {
        name: 'TOKEN',
        valueFrom: {
          secretKeyRef: {
            name: 'another-secret',
            key: 'TOKEN',
          },
        },
      },
    ]);
  });

  it('should filter out non-existing secret entries', () => {
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
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'OTHER_KEY', value: 'value' }],
        },
      },
    ];

    const result = buildExistingSecretEnvVars(envVariables);

    expect(result).toEqual([
      {
        name: 'API_KEY',
        valueFrom: {
          secretKeyRef: {
            name: 'my-secret',
            key: 'API_KEY',
          },
        },
      },
    ]);
  });

  it('should return empty array when no existing secrets', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'OTHER_KEY', value: 'value' }],
        },
      },
    ];

    const result = buildExistingSecretEnvVars(envVariables);

    expect(result).toEqual([]);
  });

  it('should handle missing existingName', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: 'API_KEY', value: '' }],
        },
      },
    ];

    const result = buildExistingSecretEnvVars(envVariables);

    expect(result).toEqual([]);
  });

  it('should handle empty envVariables array', () => {
    const result = buildExistingSecretEnvVars([]);
    expect(result).toEqual([]);
  });

  it('should use value field as secretKeyRef.key when present (round-trip fidelity)', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'my-secret',
        values: {
          category: SecretCategory.EXISTING,
          data: [
            { key: 'MY_API_KEY', value: 'api-key-v2' },
            { key: 'MY_DB_PASS', value: 'database-password' },
          ],
        },
      },
    ];

    const result = buildExistingSecretEnvVars(envVariables);

    expect(result).toEqual([
      {
        name: 'MY_API_KEY',
        valueFrom: {
          secretKeyRef: {
            name: 'my-secret',
            key: 'api-key-v2',
          },
        },
      },
      {
        name: 'MY_DB_PASS',
        valueFrom: {
          secretKeyRef: {
            name: 'my-secret',
            key: 'database-password',
          },
        },
      },
    ]);
  });

  it('should fall back to key as secretKeyRef.key when value is empty (new UI entries)', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'my-secret',
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: 'API_KEY', value: '' }],
        },
      },
    ];

    const result = buildExistingSecretEnvVars(envVariables);

    expect(result).toEqual([
      {
        name: 'API_KEY',
        valueFrom: {
          secretKeyRef: {
            name: 'my-secret',
            key: 'API_KEY',
          },
        },
      },
    ]);
  });
});
