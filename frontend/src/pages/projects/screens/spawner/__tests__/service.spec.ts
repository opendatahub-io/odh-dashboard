import type { SecretKind } from '@odh-dashboard/k8s-core';
import { EnvironmentVariableType, EnvVariable, SecretCategory } from '#~/pages/projects/types';
import { createConfigMapsAndSecretsForNotebook } from '#~/pages/projects/screens/spawner/service';

jest.mock('#~/api', () => ({
  assembleSecret: jest.fn(
    (projectName: string, data: Record<string, string>, type?: string, existingName?: string) =>
      ({
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          name: existingName ?? `secret-${type ?? 'generic'}`,
          namespace: projectName,
        },
        data,
      } as SecretKind),
  ),
  createSecret: jest.fn((secret: SecretKind) => Promise.resolve(secret)),
  replaceSecret: jest.fn((secret: SecretKind) => Promise.resolve(secret)),
  assembleConfigMap: jest.fn(),
  createConfigMap: jest.fn(),
  replaceConfigMap: jest.fn(),
  deleteConfigMap: jest.fn(),
  deleteSecret: jest.fn(),
}));

const { createSecret } = jest.requireMock<{
  createSecret: jest.Mock;
}>('#~/api');

describe('createConfigMapsAndSecretsForNotebook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should skip createSecret for SecretCategory.EXISTING env variables', async () => {
    const existingSecretVar: EnvVariable = {
      type: EnvironmentVariableType.SECRET,
      values: {
        category: SecretCategory.EXISTING,
        data: [{ key: 'password', value: '' }],
      },
    };

    const result = await createConfigMapsAndSecretsForNotebook('test-project', [existingSecretVar]);

    expect(createSecret).not.toHaveBeenCalled();
    expect(result).toStrictEqual([]);
  });

  it('should still create secrets for SecretCategory.GENERIC alongside EXISTING', async () => {
    const genericSecretVar: EnvVariable = {
      type: EnvironmentVariableType.SECRET,
      values: {
        category: SecretCategory.GENERIC,
        data: [{ key: 'test-key', value: 'test-value' }],
      },
    };
    const existingSecretVar: EnvVariable = {
      type: EnvironmentVariableType.SECRET,
      values: {
        category: SecretCategory.EXISTING,
        data: [{ key: 'password', value: '' }],
      },
    };

    const result = await createConfigMapsAndSecretsForNotebook('test-project', [
      genericSecretVar,
      existingSecretVar,
    ]);

    expect(createSecret).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0]).toStrictEqual({
      secretRef: { name: 'secret-generic' },
    });
  });
});
