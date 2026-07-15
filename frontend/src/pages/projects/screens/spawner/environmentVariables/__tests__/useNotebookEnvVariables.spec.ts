import { mockNotebookK8sResource } from '#~/__mocks__/mockNotebookK8sResource';
import { getConfigMap, getSecret } from '#~/api';
import { EnvironmentVariableType, SecretCategory } from '#~/pages/projects/types';
import { fetchNotebookEnvVariables } from '#~/pages/projects/screens/spawner/environmentVariables/useNotebookEnvVariables';

jest.mock('#~/api', () => ({
  getConfigMap: jest.fn(),
  getSecret: jest.fn(),
}));

const getConfigMapMock = jest.mocked(getConfigMap);
const getSecretMock = jest.mocked(getSecret);

describe('fetchNotebookEnvVariables', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no envFrom resources to resolve
    getConfigMapMock.mockRejectedValue({ statusObject: { code: 404 } });
    getSecretMock.mockRejectedValue({ statusObject: { code: 404 } });
  });

  it('should parse secretKeyRef entries from notebook env', async () => {
    const notebook = mockNotebookK8sResource({
      additionalEnvs: [
        {
          name: 'DB_HOST',
          valueFrom: { secretKeyRef: { name: 'db-creds', key: 'host' } },
        },
        {
          name: 'DB_PORT',
          valueFrom: { secretKeyRef: { name: 'db-creds', key: 'port' } },
        },
      ],
    });

    const result = await fetchNotebookEnvVariables(notebook);

    const existingSecretVars = result.filter((v) => v.values?.category === SecretCategory.EXISTING);
    expect(existingSecretVars).toHaveLength(1);
    expect(existingSecretVars[0]).toEqual({
      type: EnvironmentVariableType.SECRET,
      existingName: 'db-creds',
      values: {
        category: SecretCategory.EXISTING,
        data: [
          { key: 'host', value: '' },
          { key: 'port', value: '' },
        ],
      },
    });
  });

  it('should group keys by secret name', async () => {
    const notebook = mockNotebookK8sResource({
      additionalEnvs: [
        {
          name: 'KEY_A',
          valueFrom: { secretKeyRef: { name: 'secret-1', key: 'a' } },
        },
        {
          name: 'KEY_B',
          valueFrom: { secretKeyRef: { name: 'secret-2', key: 'b' } },
        },
        {
          name: 'KEY_C',
          valueFrom: { secretKeyRef: { name: 'secret-1', key: 'c' } },
        },
      ],
    });

    const result = await fetchNotebookEnvVariables(notebook);
    const existingSecretVars = result.filter((v) => v.values?.category === SecretCategory.EXISTING);

    expect(existingSecretVars).toHaveLength(2);

    const secret1 = existingSecretVars.find((v) => v.existingName === 'secret-1');
    expect(secret1?.values?.data).toEqual([
      { key: 'a', value: '' },
      { key: 'c', value: '' },
    ]);

    const secret2 = existingSecretVars.find((v) => v.existingName === 'secret-2');
    expect(secret2?.values?.data).toEqual([{ key: 'b', value: '' }]);
  });

  it('should filter out system env names (NOTEBOOK_ARGS, JUPYTER_IMAGE)', async () => {
    // The mock already includes NOTEBOOK_ARGS and JUPYTER_IMAGE by default.
    // Add a secretKeyRef so there's something to find.
    const notebook = mockNotebookK8sResource({
      additionalEnvs: [
        {
          name: 'APP_KEY',
          valueFrom: { secretKeyRef: { name: 'app-secret', key: 'key' } },
        },
      ],
    });

    const result = await fetchNotebookEnvVariables(notebook);
    const existingSecretVars = result.filter((v) => v.values?.category === SecretCategory.EXISTING);

    // NOTEBOOK_ARGS and JUPYTER_IMAGE should not appear
    expect(existingSecretVars).toHaveLength(1);
    expect(existingSecretVars[0].existingName).toBe('app-secret');
  });

  it('should return empty array for notebook with no secretKeyRef entries', async () => {
    const notebook = mockNotebookK8sResource({});

    const result = await fetchNotebookEnvVariables(notebook);
    const existingSecretVars = result.filter((v) => v.values?.category === SecretCategory.EXISTING);

    expect(existingSecretVars).toHaveLength(0);
  });

  it('should handle notebook with empty env array', async () => {
    const notebook = mockNotebookK8sResource({});
    notebook.spec.template.spec.containers[0].env = [];

    const result = await fetchNotebookEnvVariables(notebook);
    const existingSecretVars = result.filter((v) => v.values?.category === SecretCategory.EXISTING);

    expect(existingSecretVars).toHaveLength(0);
  });

  it('should handle notebook with undefined env array', async () => {
    const notebook = mockNotebookK8sResource({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (notebook.spec.template.spec.containers[0] as any).env = undefined;

    const result = await fetchNotebookEnvVariables(notebook);
    const existingSecretVars = result.filter((v) => v.values?.category === SecretCategory.EXISTING);

    expect(existingSecretVars).toHaveLength(0);
  });

  it('should skip plain env entries (no valueFrom)', async () => {
    const notebook = mockNotebookK8sResource({
      additionalEnvs: [
        { name: 'PLAIN_VAR', value: 'plain-value' },
        {
          name: 'SECRET_VAR',
          valueFrom: { secretKeyRef: { name: 'my-secret', key: 'token' } },
        },
      ],
    });

    const result = await fetchNotebookEnvVariables(notebook);
    const existingSecretVars = result.filter((v) => v.values?.category === SecretCategory.EXISTING);

    expect(existingSecretVars).toHaveLength(1);
    expect(existingSecretVars[0].existingName).toBe('my-secret');
    expect(existingSecretVars[0].values?.data).toEqual([{ key: 'token', value: '' }]);
  });
});
