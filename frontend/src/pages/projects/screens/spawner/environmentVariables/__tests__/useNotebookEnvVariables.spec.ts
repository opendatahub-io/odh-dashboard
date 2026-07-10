import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockNotebookK8sResource } from '#~/__mocks__/mockNotebookK8sResource';
import { mockCustomSecretK8sResource } from '#~/__mocks__/mockSecretK8sResource';
import { getSecret } from '#~/api';
import { EnvVariable, EnvironmentVariableType, SecretCategory } from '#~/pages/projects/types';
import {
  fetchNotebookEnvVariables,
  useNotebookEnvVariables,
} from '#~/pages/projects/screens/spawner/environmentVariables/useNotebookEnvVariables';

jest.mock('#~/api', () => ({
  getSecret: jest.fn(),
  getConfigMap: jest.fn(),
}));

const getSecretMock = jest.mocked(getSecret);

describe('fetchNotebookEnvVariables', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch environment variables from envFrom entries', async () => {
    const mockNotebook = mockNotebookK8sResource({
      envFrom: [
        {
          secretRef: {
            name: 'test-secret',
          },
        },
      ],
    });

    const mockSecret = mockCustomSecretK8sResource({
      name: 'test-secret',
      namespace: 'test-project',
      data: {
        API_KEY: btoa('decoded-value'),
        DB_PASSWORD: btoa('decoded-password'),
      },
    });

    getSecretMock.mockResolvedValue(mockSecret);

    const result = await fetchNotebookEnvVariables(mockNotebook);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: EnvironmentVariableType.SECRET,
      existingName: 'test-secret',
      values: {
        category: SecretCategory.GENERIC,
        data: [
          { key: 'API_KEY', value: 'decoded-value' },
          { key: 'DB_PASSWORD', value: 'decoded-password' },
        ],
      },
    });
  });

  it('should fetch environment variables from containers[0].env valueFrom.secretKeyRef entries', async () => {
    const mockNotebook = mockNotebookK8sResource({
      envFrom: [],
      additionalEnvs: [
        // Default env vars that should be ignored
        {
          name: 'NOTEBOOK_ARGS',
          value: '--ServerApp.port=8888',
        },
        {
          name: 'JUPYTER_IMAGE',
          value: 'image-registry.openshift-image-registry.svc:5000/opendatahub/notebook:latest',
        },
        // Secret env vars that should be parsed
        {
          name: 'API_KEY',
          valueFrom: {
            secretKeyRef: {
              name: 'api-secret',
              key: 'api-key',
            },
          },
        },
        {
          name: 'DB_PASSWORD',
          valueFrom: {
            secretKeyRef: {
              name: 'api-secret',
              key: 'db-password',
            },
          },
        },
        {
          name: 'REDIS_URL',
          valueFrom: {
            secretKeyRef: {
              name: 'redis-secret',
              key: 'url',
            },
          },
        },
      ],
    });

    const result = await fetchNotebookEnvVariables(mockNotebook);

    expect(result).toHaveLength(2);

    // Should group by secret name
    const apiSecretEntry = result.find((env: EnvVariable) => env.existingName === 'api-secret');
    expect(apiSecretEntry).toEqual({
      type: EnvironmentVariableType.SECRET,
      existingName: 'api-secret',
      values: {
        category: SecretCategory.EXISTING,
        data: [
          { key: 'API_KEY', value: '' },
          { key: 'DB_PASSWORD', value: '' },
        ],
      },
    });

    const redisSecretEntry = result.find((env: EnvVariable) => env.existingName === 'redis-secret');
    expect(redisSecretEntry).toEqual({
      type: EnvironmentVariableType.SECRET,
      existingName: 'redis-secret',
      values: {
        category: SecretCategory.EXISTING,
        data: [{ key: 'REDIS_URL', value: '' }],
      },
    });
  });

  it('should handle both envFrom and env valueFrom.secretKeyRef entries', async () => {
    const mockNotebook = mockNotebookK8sResource({
      envFrom: [
        {
          secretRef: {
            name: 'envfrom-secret',
          },
        },
      ],
      additionalEnvs: [
        {
          name: 'API_KEY',
          valueFrom: {
            secretKeyRef: {
              name: 'env-secret',
              key: 'api-key',
            },
          },
        },
      ],
    });

    const mockEnvFromSecret = mockCustomSecretK8sResource({
      name: 'envfrom-secret',
      namespace: 'test-project',
      data: {
        CONFIG_VAR: btoa('decoded-config'),
      },
    });

    getSecretMock.mockResolvedValue(mockEnvFromSecret);

    const result = await fetchNotebookEnvVariables(mockNotebook);

    expect(result).toHaveLength(2);

    // Should have one from envFrom (GENERIC category)
    const envFromEntry = result.find((env: EnvVariable) => env.existingName === 'envfrom-secret');
    expect(envFromEntry?.values?.category).toBe(SecretCategory.GENERIC);

    // Should have one from env.valueFrom (EXISTING category)
    const envEntry = result.find((env: EnvVariable) => env.existingName === 'env-secret');
    expect(envEntry?.values?.category).toBe(SecretCategory.EXISTING);
  });

  it('should ignore env entries without valueFrom.secretKeyRef', async () => {
    const mockNotebook = mockNotebookK8sResource({
      envFrom: [],
      additionalEnvs: [
        {
          name: 'NOTEBOOK_ARGS',
          value: '--ServerApp.port=8888',
        },
        {
          name: 'SOME_CONFIG',
          valueFrom: {
            configMapKeyRef: {
              name: 'config-map',
              key: 'config',
            },
          },
        },
        {
          name: 'FIELD_REF',
          valueFrom: {
            fieldRef: {
              fieldPath: 'metadata.namespace',
            },
          },
        },
      ],
    });

    const result = await fetchNotebookEnvVariables(mockNotebook);

    expect(result).toHaveLength(0);
  });

  it('should handle empty env array', async () => {
    const mockNotebook = mockNotebookK8sResource({
      envFrom: [],
      additionalEnvs: [],
    });

    const result = await fetchNotebookEnvVariables(mockNotebook);

    expect(result).toHaveLength(0);
  });
});

describe('useNotebookEnvVariables', () => {
  it('should call fetchNotebookEnvVariables', () => {
    const mockNotebook = mockNotebookK8sResource({});

    const renderResult = testHook(useNotebookEnvVariables)(mockNotebook);

    expect(renderResult).toBeDefined();
  });
});
