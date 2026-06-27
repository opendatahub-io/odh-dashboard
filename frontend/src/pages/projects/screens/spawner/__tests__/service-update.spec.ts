import type { ConfigMapKind, SecretKind } from '@odh-dashboard/k8s-core';
import type { NotebookKind } from '#~/k8sTypes';
import {
  EnvVariable,
  EnvironmentVariableType,
  SecretCategory,
  ConfigMapCategory,
} from '#~/pages/projects/types';
import * as api from '#~/api';
import { updateConfigMapsAndSecretsForNotebook } from '#~/pages/projects/screens/spawner/service';
import { fetchNotebookEnvVariables } from '#~/pages/projects/screens/spawner/environmentVariables/useNotebookEnvVariables';

jest.mock('#~/api', () => ({
  ...jest.requireActual('#~/api'),
  createSecret: jest.fn(),
  createConfigMap: jest.fn(),
  deleteSecret: jest.fn(),
  deleteConfigMap: jest.fn(),
  replaceSecret: jest.fn(),
  replaceConfigMap: jest.fn(),
}));

jest.mock('#~/pages/projects/screens/spawner/environmentVariables/useNotebookEnvVariables', () => ({
  fetchNotebookEnvVariables: jest.fn(),
}));

const createSecretMock = jest.mocked(api.createSecret);
const createConfigMapMock = jest.mocked(api.createConfigMap);
const deleteSecretMock = jest.mocked(api.deleteSecret);
const replaceSecretMock = jest.mocked(api.replaceSecret);
const fetchNotebookEnvVariablesMock = jest.mocked(fetchNotebookEnvVariables);

const mockNotebook: NotebookKind = {
  apiVersion: 'kubeflow.org/v1',
  kind: 'Notebook',
  metadata: {
    name: 'test-notebook',
    namespace: 'test-project',
  },
  spec: {
    template: {
      spec: {
        containers: [
          {
            name: 'test-notebook',
            image: 'test-image',
            env: [
              {
                name: 'NOTEBOOK_ARGS',
                value: '--ServerApp.port=8888',
              },
              {
                name: 'JUPYTER_IMAGE',
                value: 'test-image',
              },
            ],
            envFrom: [],
          },
        ],
      },
    },
  },
  status: {
    readyReplicas: 0,
  },
};

describe('updateConfigMapsAndSecretsForNotebook - EXISTING secret handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchNotebookEnvVariablesMock.mockResolvedValue([]);
  });

  it('should return both envFrom and existingSecretEnvVars when EXISTING secret is added', async () => {
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
    ];

    createSecretMock.mockResolvedValue({
      kind: 'Secret',
      metadata: { name: 'generated-secret' },
    } as SecretKind);

    const result = await updateConfigMapsAndSecretsForNotebook(
      'test-project',
      mockNotebook,
      envVariables,
      undefined,
      false,
    );

    expect(result).toEqual({
      envFrom: [{ secretRef: { name: 'generated-secret' } }],
      existingSecretEnvVars: [{ name: 's3-credentials', key: 'AWS_ACCESS_KEY_ID' }],
    });

    expect(createSecretMock).toHaveBeenCalledTimes(1);
  });

  it('should not create K8s Secret for EXISTING secrets', async () => {
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

    const result = await updateConfigMapsAndSecretsForNotebook(
      'test-project',
      mockNotebook,
      envVariables,
      undefined,
      false,
    );

    expect(createSecretMock).not.toHaveBeenCalled();
    expect(deleteSecretMock).not.toHaveBeenCalled();
    expect(replaceSecretMock).not.toHaveBeenCalled();

    expect(result).toEqual({
      envFrom: [],
      existingSecretEnvVars: [
        { name: 's3-credentials', key: 'AWS_ACCESS_KEY_ID' },
        { name: 's3-credentials', key: 'AWS_SECRET_ACCESS_KEY' },
      ],
    });
  });

  it('should remove old EXISTING secret refs when they are no longer in the new env list', async () => {
    fetchNotebookEnvVariablesMock.mockResolvedValue([
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.EXISTING,
          secretName: 'old-secret',
          data: [{ key: 'OLD_KEY', value: '' }],
        },
        existingName: 'old-secret',
      },
    ]);

    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.EXISTING,
          secretName: 'new-secret',
          data: [{ key: 'NEW_KEY', value: '' }],
        },
      },
    ];

    const result = await updateConfigMapsAndSecretsForNotebook(
      'test-project',
      mockNotebook,
      envVariables,
      undefined,
      false,
    );

    expect(deleteSecretMock).not.toHaveBeenCalled();

    expect(result).toEqual({
      envFrom: [],
      existingSecretEnvVars: [{ name: 'new-secret', key: 'NEW_KEY' }],
    });
  });

  it('should preserve inline secrets via envFrom and handle EXISTING secrets separately', async () => {
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

    createSecretMock.mockResolvedValue({
      kind: 'Secret',
      metadata: { name: 'generated-secret' },
    } as SecretKind);

    createConfigMapMock.mockResolvedValue({
      kind: 'ConfigMap',
      metadata: { name: 'generated-configmap' },
    } as ConfigMapKind);

    const result = await updateConfigMapsAndSecretsForNotebook(
      'test-project',
      mockNotebook,
      envVariables,
      undefined,
      false,
    );

    expect(result).toEqual({
      envFrom: [
        { secretRef: { name: 'generated-secret' } },
        { configMapRef: { name: 'generated-configmap' } },
      ],
      existingSecretEnvVars: [{ name: 's3-credentials', key: 'AWS_ACCESS_KEY_ID' }],
    });

    expect(createSecretMock).toHaveBeenCalledTimes(1);
    expect(createConfigMapMock).toHaveBeenCalledTimes(1);
  });

  it('should handle update from inline secret to EXISTING secret', async () => {
    fetchNotebookEnvVariablesMock.mockResolvedValue([
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'OLD_INLINE_KEY', value: 'old-value' }],
        },
        existingName: 'old-inline-secret',
      },
    ]);

    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.EXISTING,
          secretName: 'new-existing-secret',
          data: [{ key: 'NEW_KEY', value: '' }],
        },
      },
    ];

    deleteSecretMock.mockResolvedValue({ status: 'Success' });

    const result = await updateConfigMapsAndSecretsForNotebook(
      'test-project',
      mockNotebook,
      envVariables,
      undefined,
      false,
    );

    expect(deleteSecretMock).toHaveBeenCalledWith('test-project', 'old-inline-secret', {
      dryRun: false,
    });

    expect(result).toEqual({
      envFrom: [],
      existingSecretEnvVars: [{ name: 'new-existing-secret', key: 'NEW_KEY' }],
    });
  });

  it('should handle updating existing workbench without any EXISTING secrets (AC8)', async () => {
    fetchNotebookEnvVariablesMock.mockResolvedValue([
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'INLINE_KEY', value: 'inline-value' }],
        },
        existingName: 'existing-inline-secret',
      },
    ]);

    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'INLINE_KEY', value: 'updated-value' }],
        },
        existingName: 'existing-inline-secret',
      },
    ];

    replaceSecretMock.mockResolvedValue({
      kind: 'Secret',
      metadata: { name: 'existing-inline-secret' },
    } as SecretKind);

    const result = await updateConfigMapsAndSecretsForNotebook(
      'test-project',
      mockNotebook,
      envVariables,
      undefined,
      false,
    );

    expect(replaceSecretMock).toHaveBeenCalledTimes(1);

    expect(result).toEqual({
      envFrom: [{ secretRef: { name: 'existing-inline-secret' } }],
      existingSecretEnvVars: [],
    });
  });

  it('should handle multiple EXISTING secrets', async () => {
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

    const result = await updateConfigMapsAndSecretsForNotebook(
      'test-project',
      mockNotebook,
      envVariables,
      undefined,
      false,
    );

    expect(result).toEqual({
      envFrom: [],
      existingSecretEnvVars: [
        { name: 's3-credentials', key: 'AWS_ACCESS_KEY_ID' },
        { name: 'db-credentials', key: 'DB_USER' },
        { name: 'db-credentials', key: 'DB_PASSWORD' },
      ],
    });
  });
});
