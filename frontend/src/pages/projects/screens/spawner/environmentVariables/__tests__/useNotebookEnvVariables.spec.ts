import { getConfigMap, getSecret } from '#~/api';
import { mockNotebookK8sResource } from '#~/__mocks__/mockNotebookK8sResource';
import { mockSecretK8sResource } from '#~/__mocks__/mockSecretK8sResource';
import { mockConfigMap } from '#~/__mocks__/mockConfigMap';
import { isConnection } from '#~/concepts/connectionTypes/utils';
import { EnvironmentVariableType, SecretCategory } from '#~/pages/projects/types';
import { fetchNotebookEnvVariables } from '#~/pages/projects/screens/spawner/environmentVariables/useNotebookEnvVariables';

jest.mock('#~/api', () => ({
  getConfigMap: jest.fn(),
  getSecret: jest.fn(),
}));

jest.mock('#~/concepts/connectionTypes/utils', () => ({
  isConnection: jest.fn(),
}));

const mockGetConfigMap = jest.mocked(getConfigMap);
const mockGetSecret = jest.mocked(getSecret);
const mockIsConnection = jest.mocked(isConnection);

describe('fetchNotebookEnvVariables', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConnection.mockReturnValue(false);
  });

  describe('envFrom parsing (existing behavior)', () => {
    it('should parse envFrom.secretRef entries', async () => {
      const secret = mockSecretK8sResource({
        name: 'my-secret',
        data: { KEY1: btoa('value1'), KEY2: btoa('value2') },
      });
      mockGetSecret.mockResolvedValue(secret);

      const notebook = mockNotebookK8sResource({
        name: 'test-notebook',
        namespace: 'test-ns',
        envFrom: [{ secretRef: { name: 'my-secret' } }],
      });

      const result = await fetchNotebookEnvVariables(notebook);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: EnvironmentVariableType.SECRET,
        existingName: 'my-secret',
        values: {
          category: SecretCategory.GENERIC,
          data: [
            { key: 'KEY1', value: 'value1' },
            { key: 'KEY2', value: 'value2' },
          ],
        },
      });
    });

    it('should parse envFrom.configMapRef entries', async () => {
      const configMap = mockConfigMap({
        name: 'my-configmap',
        data: { KEY1: 'value1', KEY2: 'value2' },
      });
      mockGetConfigMap.mockResolvedValue(configMap);

      const notebook = mockNotebookK8sResource({
        name: 'test-notebook',
        namespace: 'test-ns',
        envFrom: [{ configMapRef: { name: 'my-configmap' } }],
      });

      const result = await fetchNotebookEnvVariables(notebook);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: EnvironmentVariableType.CONFIG_MAP,
        existingName: 'my-configmap',
        values: {
          category: expect.any(String),
          data: [
            { key: 'KEY1', value: 'value1' },
            { key: 'KEY2', value: 'value2' },
          ],
        },
      });
    });
  });

  describe('env[].valueFrom.secretKeyRef parsing (new behavior)', () => {
    it('should parse env entries with valueFrom.secretKeyRef', async () => {
      const notebook = mockNotebookK8sResource({
        name: 'test-notebook',
        namespace: 'test-ns',
        envFrom: [],
        additionalEnvs: [
          {
            name: 'DB_PASSWORD',
            valueFrom: {
              secretKeyRef: {
                name: 'db-credentials',
                key: 'password',
              },
            },
          },
          {
            name: 'DB_USERNAME',
            valueFrom: {
              secretKeyRef: {
                name: 'db-credentials',
                key: 'username',
              },
            },
          },
        ],
      });

      const result = await fetchNotebookEnvVariables(notebook);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: EnvironmentVariableType.SECRET,
        existingName: undefined,
        values: {
          category: SecretCategory.EXISTING,
          secretName: 'db-credentials',
          data: [
            { key: 'password', value: '' },
            { key: 'username', value: '' },
          ],
          allKeys: false,
        },
      });
    });

    it('should group multiple env entries by secret name', async () => {
      const notebook = mockNotebookK8sResource({
        name: 'test-notebook',
        namespace: 'test-ns',
        envFrom: [],
        additionalEnvs: [
          {
            name: 'DB_PASSWORD',
            valueFrom: { secretKeyRef: { name: 'db-creds', key: 'password' } },
          },
          {
            name: 'DB_USERNAME',
            valueFrom: { secretKeyRef: { name: 'db-creds', key: 'username' } },
          },
          {
            name: 'API_KEY',
            valueFrom: { secretKeyRef: { name: 'api-secret', key: 'key' } },
          },
          {
            name: 'API_TOKEN',
            valueFrom: { secretKeyRef: { name: 'api-secret', key: 'token' } },
          },
        ],
      });

      const result = await fetchNotebookEnvVariables(notebook);

      expect(result).toHaveLength(2);
      expect(result.find((e) => e.values?.secretName === 'db-creds')).toEqual({
        type: EnvironmentVariableType.SECRET,
        existingName: undefined,
        values: {
          category: SecretCategory.EXISTING,
          secretName: 'db-creds',
          data: [
            { key: 'password', value: '' },
            { key: 'username', value: '' },
          ],
          allKeys: false,
        },
      });
      expect(result.find((e) => e.values?.secretName === 'api-secret')).toEqual({
        type: EnvironmentVariableType.SECRET,
        existingName: undefined,
        values: {
          category: SecretCategory.EXISTING,
          secretName: 'api-secret',
          data: [
            { key: 'key', value: '' },
            { key: 'token', value: '' },
          ],
          allKeys: false,
        },
      });
    });

    it('should skip env entries without valueFrom.secretKeyRef', async () => {
      const notebook = mockNotebookK8sResource({
        name: 'test-notebook',
        namespace: 'test-ns',
        envFrom: [],
        additionalEnvs: [
          { name: 'NOTEBOOK_ARGS', value: 'some-value' },
          { name: 'JUPYTER_IMAGE', value: 'image:latest' },
          {
            name: 'DB_PASSWORD',
            valueFrom: { secretKeyRef: { name: 'db-creds', key: 'password' } },
          },
        ],
      });

      const result = await fetchNotebookEnvVariables(notebook);

      expect(result).toHaveLength(1);
      expect(result[0].values?.secretName).toBe('db-creds');
    });

    it('should skip env entries with other valueFrom sources', async () => {
      const notebook = mockNotebookK8sResource({
        name: 'test-notebook',
        namespace: 'test-ns',
        envFrom: [],
        additionalEnvs: [
          {
            name: 'CONFIG_VALUE',
            valueFrom: { configMapKeyRef: { name: 'config', key: 'value' } },
          },
          {
            name: 'POD_NAME',
            valueFrom: { fieldRef: { fieldPath: 'metadata.name' } },
          },
          {
            name: 'DB_PASSWORD',
            valueFrom: { secretKeyRef: { name: 'db-creds', key: 'password' } },
          },
        ],
      });

      const result = await fetchNotebookEnvVariables(notebook);

      expect(result).toHaveLength(1);
      expect(result[0].values?.secretName).toBe('db-creds');
    });

    it('should handle notebook with no env array', async () => {
      const notebook = mockNotebookK8sResource({
        name: 'test-notebook',
        namespace: 'test-ns',
        envFrom: [],
      });

      const result = await fetchNotebookEnvVariables(notebook);

      expect(result).toEqual([]);
    });

    it('should handle notebook with empty env array', async () => {
      const notebook = mockNotebookK8sResource({
        name: 'test-notebook',
        namespace: 'test-ns',
        envFrom: [],
        additionalEnvs: [],
      });

      const result = await fetchNotebookEnvVariables(notebook);

      expect(result).toEqual([]);
    });
  });

  describe('combined envFrom and env parsing', () => {
    it('should return both envFrom and env-based env vars', async () => {
      const secret = mockSecretK8sResource({
        name: 'full-secret',
        data: { KEY1: btoa('value1'), KEY2: btoa('value2') },
      });
      mockGetSecret.mockResolvedValue(secret);

      const notebook = mockNotebookK8sResource({
        name: 'test-notebook',
        namespace: 'test-ns',
        envFrom: [{ secretRef: { name: 'full-secret' } }],
        additionalEnvs: [
          {
            name: 'DB_PASSWORD',
            valueFrom: { secretKeyRef: { name: 'db-creds', key: 'password' } },
          },
        ],
      });

      const result = await fetchNotebookEnvVariables(notebook);

      expect(result).toHaveLength(2);
      expect(result.find((e) => e.existingName === 'full-secret')).toEqual({
        type: EnvironmentVariableType.SECRET,
        existingName: 'full-secret',
        values: {
          category: SecretCategory.GENERIC,
          data: [
            { key: 'KEY1', value: 'value1' },
            { key: 'KEY2', value: 'value2' },
          ],
        },
      });
      expect(result.find((e) => e.values?.secretName === 'db-creds')).toEqual({
        type: EnvironmentVariableType.SECRET,
        existingName: undefined,
        values: {
          category: SecretCategory.EXISTING,
          secretName: 'db-creds',
          data: [{ key: 'password', value: '' }],
          allKeys: false,
        },
      });
    });
  });

  describe('manually-added envFrom blocks (AC9)', () => {
    it('should handle manually-added envFrom.secretRef entries', async () => {
      const manualSecret = mockSecretK8sResource({
        name: 'manual-secret',
        data: { MANUAL_KEY: btoa('manual-value') },
      });
      mockGetSecret.mockResolvedValue(manualSecret);

      const notebook = mockNotebookK8sResource({
        name: 'test-notebook',
        namespace: 'test-ns',
        envFrom: [{ secretRef: { name: 'manual-secret' } }],
      });

      const result = await fetchNotebookEnvVariables(notebook);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: EnvironmentVariableType.SECRET,
        existingName: 'manual-secret',
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'MANUAL_KEY', value: 'manual-value' }],
        },
      });
    });

    it('should handle 404 errors for deleted secrets gracefully', async () => {
      mockGetSecret.mockRejectedValue({ statusObject: { code: 404 } });

      const notebook = mockNotebookK8sResource({
        name: 'test-notebook',
        namespace: 'test-ns',
        envFrom: [{ secretRef: { name: 'deleted-secret' } }],
      });

      const result = await fetchNotebookEnvVariables(notebook);

      expect(result).toEqual([]);
    });
  });
});
