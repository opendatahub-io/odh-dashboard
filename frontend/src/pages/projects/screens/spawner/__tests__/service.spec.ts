import {
  EnvironmentVariableType,
  EnvVariable,
  SecretCategory,
  ConfigMapCategory,
} from '#~/pages/projects/types';
import { getSecretKeyRefEnvVars } from '#~/src/pages/projects/screens/spawner/service';

describe('getSecretKeyRefEnvVars', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when no env variables provided', () => {
    const result = getSecretKeyRefEnvVars([]);
    expect(result).toEqual([]);
  });

  it('should return empty array when no EXISTING category env vars exist', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'test-secret',
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'KEY', value: 'VALUE' }],
        },
      },
      {
        type: EnvironmentVariableType.CONFIG_MAP,
        existingName: 'test-cm',
        values: {
          category: ConfigMapCategory.GENERIC,
          data: [{ key: 'KEY', value: 'VALUE' }],
        },
      },
    ];
    const result = getSecretKeyRefEnvVars(envVars);
    expect(result).toEqual([]);
  });

  it('should generate secretKeyRef entries for a single secret with one key', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.EXISTING, data: [] },
        existingSecretRefs: [{ secretName: 'db-credentials', selectedKeys: ['DB_PASSWORD'] }],
      },
    ];
    const result = getSecretKeyRefEnvVars(envVars);
    expect(result).toEqual([
      {
        name: 'DB_PASSWORD',
        valueFrom: { secretKeyRef: { name: 'db-credentials', key: 'DB_PASSWORD' } },
      },
    ]);
  });

  it('should generate secretKeyRef entries for a single secret with multiple keys', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.EXISTING, data: [] },
        existingSecretRefs: [
          {
            secretName: 'aws-credentials',
            selectedKeys: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
          },
        ],
      },
    ];
    const result = getSecretKeyRefEnvVars(envVars);
    expect(result).toEqual([
      {
        name: 'AWS_ACCESS_KEY_ID',
        valueFrom: { secretKeyRef: { name: 'aws-credentials', key: 'AWS_ACCESS_KEY_ID' } },
      },
      {
        name: 'AWS_SECRET_ACCESS_KEY',
        valueFrom: {
          secretKeyRef: { name: 'aws-credentials', key: 'AWS_SECRET_ACCESS_KEY' },
        },
      },
    ]);
  });

  it('should generate secretKeyRef entries for multiple secrets', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.EXISTING, data: [] },
        existingSecretRefs: [
          { secretName: 'db-credentials', selectedKeys: ['DB_PASSWORD'] },
          { secretName: 'api-secret', selectedKeys: ['API_KEY'] },
        ],
      },
    ];
    const result = getSecretKeyRefEnvVars(envVars);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      name: 'DB_PASSWORD',
      valueFrom: { secretKeyRef: { name: 'db-credentials', key: 'DB_PASSWORD' } },
    });
    expect(result).toContainEqual({
      name: 'API_KEY',
      valueFrom: { secretKeyRef: { name: 'api-secret', key: 'API_KEY' } },
    });
  });

  it('should handle env variables with undefined existingSecretRefs', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.EXISTING, data: [] },
      },
    ];
    const result = getSecretKeyRefEnvVars(envVars);
    expect(result).toEqual([]);
  });

  it('should handle empty selectedKeys array', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.EXISTING, data: [] },
        existingSecretRefs: [{ secretName: 'empty-secret', selectedKeys: [] }],
      },
    ];
    const result = getSecretKeyRefEnvVars(envVars);
    expect(result).toEqual([]);
  });

  it('should ignore non-EXISTING category env vars while processing EXISTING ones', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'test-secret',
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'KEY', value: 'VALUE' }],
        },
      },
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.EXISTING, data: [] },
        existingSecretRefs: [{ secretName: 'my-secret', selectedKeys: ['MY_KEY'] }],
      },
    ];
    const result = getSecretKeyRefEnvVars(envVars);
    expect(result).toEqual([
      {
        name: 'MY_KEY',
        valueFrom: { secretKeyRef: { name: 'my-secret', key: 'MY_KEY' } },
      },
    ]);
  });
});
