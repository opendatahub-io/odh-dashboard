import { mockNotebookK8sResource } from '#~/__mocks__/mockNotebookK8sResource';
import { getSecret, getConfigMap } from '#~/api';
import { EnvironmentVariableType, SecretCategory } from '#~/pages/projects/types';
import { fetchNotebookEnvVariables } from '#~/pages/projects/screens/spawner/environmentVariables/useNotebookEnvVariables';

jest.mock('#~/api', () => ({
  getSecret: jest.fn(),
  getConfigMap: jest.fn(),
}));

const getSecretMock = jest.mocked(getSecret);
const getConfigMapMock = jest.mocked(getConfigMap);

describe('fetchNotebookEnvVariables', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should parse secretKeyRef entries and group by secret name', async () => {
    const notebook = mockNotebookK8sResource({
      envFrom: [],
      additionalEnvs: [
        { name: 'DB_HOST', valueFrom: { secretKeyRef: { name: 'db-secret', key: 'DB_HOST' } } },
        { name: 'DB_PORT', valueFrom: { secretKeyRef: { name: 'db-secret', key: 'DB_PORT' } } },
        { name: 'API_KEY', valueFrom: { secretKeyRef: { name: 'api-secret', key: 'API_KEY' } } },
      ],
    });

    getSecretMock.mockImplementation((_ns, secretName) => {
      if (secretName === 'db-secret') {
        return Promise.resolve({
          kind: 'Secret',
          apiVersion: 'v1',
          metadata: { name: 'db-secret', namespace: 'test-project' },
          data: { DB_HOST: 'aG9zdA==', DB_PORT: 'NTQzMg==', DB_PASS: 'cGFzcw==' },
        });
      }
      if (secretName === 'api-secret') {
        return Promise.resolve({
          kind: 'Secret',
          apiVersion: 'v1',
          metadata: { name: 'api-secret', namespace: 'test-project' },
          data: { API_KEY: 'a2V5', API_URL: 'dXJs' },
        });
      }
      return Promise.reject(new Error('not found'));
    });

    const result = await fetchNotebookEnvVariables(notebook);
    const existingSecretVar = result.find((v) => v.values?.category === SecretCategory.EXISTING);
    expect(existingSecretVar).toBeDefined();
    expect(existingSecretVar?.existingSecrets).toHaveLength(2);

    const dbRef = existingSecretVar?.existingSecrets?.find((r) => r.secretName === 'db-secret');
    expect(dbRef?.selectedKeys).toStrictEqual(['DB_HOST', 'DB_PORT']);
    expect(dbRef?.allKeys).toStrictEqual(['DB_HOST', 'DB_PORT', 'DB_PASS']);

    const apiRef = existingSecretVar?.existingSecrets?.find((r) => r.secretName === 'api-secret');
    expect(apiRef?.selectedKeys).toStrictEqual(['API_KEY']);
    expect(apiRef?.allKeys).toStrictEqual(['API_KEY', 'API_URL']);
  });

  it('should handle 404 for secretKeyRef secrets gracefully', async () => {
    const notebook = mockNotebookK8sResource({
      envFrom: [],
      additionalEnvs: [
        {
          name: 'MISSING_KEY',
          valueFrom: { secretKeyRef: { name: 'gone-secret', key: 'MISSING_KEY' } },
        },
      ],
    });

    getSecretMock.mockRejectedValue({ statusObject: { code: 404 } });

    const result = await fetchNotebookEnvVariables(notebook);
    const existingSecretVar = result.find((v) => v.values?.category === SecretCategory.EXISTING);
    expect(existingSecretVar).toBeDefined();
    const ref = existingSecretVar?.existingSecrets?.[0];
    expect(ref?.secretName).toBe('gone-secret');
    // When 404, allKeys fallback to selectedKeys
    expect(ref?.allKeys).toStrictEqual(['MISSING_KEY']);
  });

  it('should handle non-404 errors and return error status', async () => {
    const notebook = mockNotebookK8sResource({
      envFrom: [],
      additionalEnvs: [
        {
          name: 'ERR_KEY',
          valueFrom: { secretKeyRef: { name: 'err-secret', key: 'ERR_KEY' } },
        },
      ],
    });

    getSecretMock.mockRejectedValue({ statusObject: { code: 500 } });

    const result = await fetchNotebookEnvVariables(notebook);
    const existingSecretVar = result.find((v) => v.values?.category === SecretCategory.EXISTING);
    expect(existingSecretVar).toBeDefined();
    const ref = existingSecretVar?.existingSecrets?.[0];
    expect(ref?.secretName).toBe('err-secret');
    expect(ref?.allKeys).toStrictEqual(['ERR_KEY']);
  });

  it('should return envFrom variables without secretKeyRef entries', async () => {
    const notebook = mockNotebookK8sResource({
      envFrom: [{ configMapRef: { name: 'my-configmap' } }],
    });

    getConfigMapMock.mockResolvedValue({
      kind: 'ConfigMap',
      apiVersion: 'v1',
      metadata: { name: 'my-configmap', namespace: 'test-project' },
      data: { SOME_VAR: 'value' },
    });

    const result = await fetchNotebookEnvVariables(notebook);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe(EnvironmentVariableType.CONFIG_MAP);
    expect(result[0].existingName).toBe('my-configmap');
  });

  it('should return empty when notebook has no env or envFrom entries', async () => {
    const notebook = mockNotebookK8sResource({ envFrom: [] });
    const result = await fetchNotebookEnvVariables(notebook);
    expect(result).toStrictEqual([]);
  });
});
