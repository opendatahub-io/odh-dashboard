import type { ConfigMapKind, SecretKind } from '@odh-dashboard/k8s-core';
import {
  EnvVariable,
  EnvironmentVariableType,
  SecretCategory,
  ConfigMapCategory,
} from '#~/pages/projects/types';
import * as api from '#~/api';
import {
  createConfigMapsAndSecretsForNotebook,
  extractExistingSecretEnvVars,
} from '#~/pages/projects/screens/spawner/service';

jest.mock('#~/api', () => ({
  ...jest.requireActual('#~/api'),
  createSecret: jest.fn(),
  createConfigMap: jest.fn(),
}));

const createSecretMock = jest.mocked(api.createSecret);
const createConfigMapMock = jest.mocked(api.createConfigMap);

describe('extractExistingSecretEnvVars', () => {
  it('should return empty array for empty input', () => {
    const result = extractExistingSecretEnvVars([]);
    expect(result).toEqual([]);
  });

  it('should extract env vars from EXISTING secret with single key', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.EXISTING,
          secretName: 's3-credentials',
          data: [{ key: 'AWS_ACCESS_KEY_ID', value: '' }],
        },
      },
    ];

    const result = extractExistingSecretEnvVars(envVariables);
    expect(result).toEqual([{ name: 's3-credentials', key: 'AWS_ACCESS_KEY_ID' }]);
  });

  it('should extract env vars from EXISTING secret with multiple keys', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.EXISTING,
          secretName: 's3-credentials',
          data: [
            { key: 'AWS_ACCESS_KEY_ID', value: '' },
            { key: 'AWS_SECRET_ACCESS_KEY', value: '' },
          ],
        },
      },
    ];

    const result = extractExistingSecretEnvVars(envVariables);
    expect(result).toEqual([
      { name: 's3-credentials', key: 'AWS_ACCESS_KEY_ID' },
      { name: 's3-credentials', key: 'AWS_SECRET_ACCESS_KEY' },
    ]);
  });

  it('should extract env vars from multiple EXISTING secrets', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.EXISTING,
          secretName: 's3-credentials',
          data: [{ key: 'AWS_ACCESS_KEY_ID', value: '' }],
        },
      },
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.EXISTING,
          secretName: 'db-credentials',
          data: [
            { key: 'DB_USER', value: '' },
            { key: 'DB_PASSWORD', value: '' },
          ],
        },
      },
    ];

    const result = extractExistingSecretEnvVars(envVariables);
    expect(result).toEqual([
      { name: 's3-credentials', key: 'AWS_ACCESS_KEY_ID' },
      { name: 'db-credentials', key: 'DB_USER' },
      { name: 'db-credentials', key: 'DB_PASSWORD' },
    ]);
  });

  it('should skip env vars without values', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: undefined,
      },
    ];

    const result = extractExistingSecretEnvVars(envVariables);
    expect(result).toEqual([]);
  });

  it('should skip non-EXISTING secret categories', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'KEY', value: 'value' }],
        },
      },
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.AWS,
          data: [{ key: 'KEY', value: 'value' }],
        },
      },
      {
        type: EnvironmentVariableType.CONFIG_MAP,
        values: {
          category: ConfigMapCategory.GENERIC,
          data: [{ key: 'KEY', value: 'value' }],
        },
      },
    ];

    const result = extractExistingSecretEnvVars(envVariables);
    expect(result).toEqual([]);
  });

  it('should skip EXISTING secrets without secretName', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: 'KEY', value: '' }],
        },
      },
    ];

    const result = extractExistingSecretEnvVars(envVariables);
    expect(result).toEqual([]);
  });

  it('should skip EXISTING secrets with empty data array', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.EXISTING,
          secretName: 's3-credentials',
          data: [],
        },
      },
    ];

    const result = extractExistingSecretEnvVars(envVariables);
    expect(result).toEqual([]);
  });

  it('should handle mixed EXISTING and non-EXISTING env vars', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.EXISTING,
          secretName: 's3-credentials',
          data: [{ key: 'AWS_ACCESS_KEY_ID', value: '' }],
        },
      },
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'INLINE_KEY', value: 'inline-value' }],
        },
      },
      {
        type: EnvironmentVariableType.CONFIG_MAP,
        values: {
          category: ConfigMapCategory.GENERIC,
          data: [{ key: 'CONFIG_KEY', value: 'config-value' }],
        },
      },
    ];

    const result = extractExistingSecretEnvVars(envVariables);
    expect(result).toEqual([{ name: 's3-credentials', key: 'AWS_ACCESS_KEY_ID' }]);
  });
});

describe('createConfigMapsAndSecretsForNotebook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not create K8s resources for EXISTING secrets', async () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.EXISTING,
          secretName: 's3-credentials',
          data: [{ key: 'AWS_ACCESS_KEY_ID', value: '' }],
        },
      },
    ];

    const result = await createConfigMapsAndSecretsForNotebook('test-project', envVariables);

    expect(createSecretMock).not.toHaveBeenCalled();
    expect(createConfigMapMock).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('should create K8s resources for GENERIC secrets but not EXISTING', async () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'INLINE_KEY', value: 'inline-value' }],
        },
      },
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.EXISTING,
          secretName: 's3-credentials',
          data: [{ key: 'AWS_ACCESS_KEY_ID', value: '' }],
        },
      },
    ];

    createSecretMock.mockResolvedValue({
      kind: 'Secret',
      metadata: { name: 'generated-secret', namespace: 'test-project' },
    } as SecretKind);

    const result = await createConfigMapsAndSecretsForNotebook('test-project', envVariables);

    expect(createSecretMock).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      secretRef: { name: 'generated-secret' },
    });
  });

  it('should handle multiple EXISTING secrets without creating resources', async () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.EXISTING,
          secretName: 's3-credentials',
          data: [{ key: 'AWS_ACCESS_KEY_ID', value: '' }],
        },
      },
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.EXISTING,
          secretName: 'db-credentials',
          data: [{ key: 'DB_USER', value: '' }],
        },
      },
    ];

    const result = await createConfigMapsAndSecretsForNotebook('test-project', envVariables);

    expect(createSecretMock).not.toHaveBeenCalled();
    expect(createConfigMapMock).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('should handle mixed EXISTING and AWS secrets', async () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.AWS,
          data: [
            { key: 'Name', value: 'my-aws-connection' },
            { key: 'AWS_ACCESS_KEY_ID', value: 'inline-key' },
            { key: 'AWS_SECRET_ACCESS_KEY', value: 'inline-secret' },
          ],
        },
      },
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.EXISTING,
          secretName: 's3-credentials',
          data: [{ key: 'S3_BUCKET', value: '' }],
        },
      },
    ];

    createSecretMock.mockResolvedValue({
      kind: 'Secret',
      metadata: { name: 'aws-secret', namespace: 'test-project' },
    } as SecretKind);

    const result = await createConfigMapsAndSecretsForNotebook('test-project', envVariables);

    expect(createSecretMock).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
  });

  it('should handle ConfigMaps alongside EXISTING secrets', async () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.CONFIG_MAP,
        values: {
          category: ConfigMapCategory.GENERIC,
          data: [{ key: 'CONFIG_KEY', value: 'config-value' }],
        },
      },
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.EXISTING,
          secretName: 's3-credentials',
          data: [{ key: 'AWS_ACCESS_KEY_ID', value: '' }],
        },
      },
    ];

    createConfigMapMock.mockResolvedValue({
      kind: 'ConfigMap',
      metadata: { name: 'generated-config', namespace: 'test-project' },
    } as ConfigMapKind);

    const result = await createConfigMapsAndSecretsForNotebook('test-project', envVariables);

    expect(createConfigMapMock).toHaveBeenCalledTimes(1);
    expect(createSecretMock).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      configMapRef: { name: 'generated-config' },
    });
  });
});
