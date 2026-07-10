import { mockNotebookK8sResource } from '#~/__mocks__/mockNotebookK8sResource';
import { mockCustomSecretK8sResource } from '#~/__mocks__/mockSecretK8sResource';
import { getSecret } from '#~/api';
import { EnvironmentVariableType, SecretCategory } from '#~/pages/projects/types';
import { fetchNotebookEnvVariables } from '#~/pages/projects/screens/spawner/environmentVariables/useNotebookEnvVariables';

jest.mock('#~/api', () => ({
  getConfigMap: jest.fn(),
  getSecret: jest.fn(),
}));

const getSecretMock = jest.mocked(getSecret);

describe('fetchNotebookEnvVariables', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reconstruct existing secret references from env[].valueFrom.secretKeyRef', async () => {
    const notebook = mockNotebookK8sResource({
      envFrom: [],
      additionalEnvs: [
        {
          name: 'DB_HOST',
          valueFrom: {
            secretKeyRef: { name: 'my-db-secret', key: 'DB_HOST' },
          },
        },
        {
          name: 'DB_PORT',
          valueFrom: {
            secretKeyRef: { name: 'my-db-secret', key: 'DB_PORT' },
          },
        },
      ],
    });

    const result = await fetchNotebookEnvVariables(notebook);

    expect(result).toEqual([
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'my-db-secret',
        values: {
          category: SecretCategory.EXISTING,
          data: [
            { key: 'DB_HOST', value: '' },
            { key: 'DB_PORT', value: '' },
          ],
        },
      },
    ]);
  });

  it('should skip env entries with plain value (like NOTEBOOK_ARGS, JUPYTER_IMAGE)', async () => {
    const notebook = mockNotebookK8sResource({
      envFrom: [],
      // The default mock already includes NOTEBOOK_ARGS and JUPYTER_IMAGE with value (not valueFrom)
      additionalEnvs: [
        {
          name: 'MY_KEY',
          valueFrom: {
            secretKeyRef: { name: 'my-secret', key: 'MY_KEY' },
          },
        },
      ],
    });

    const result = await fetchNotebookEnvVariables(notebook);

    // Should only include the secretKeyRef entry, not NOTEBOOK_ARGS or JUPYTER_IMAGE
    expect(result).toEqual([
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'my-secret',
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: 'MY_KEY', value: '' }],
        },
      },
    ]);
  });

  it('should skip env entries with non-secretKeyRef valueFrom (like fieldRef)', async () => {
    const notebook = mockNotebookK8sResource({
      envFrom: [],
      additionalEnvs: [
        {
          name: 'NAMESPACE',
          valueFrom: {
            fieldRef: { fieldPath: 'metadata.namespace' },
          },
        },
        {
          name: 'SECRET_VAL',
          valueFrom: {
            secretKeyRef: { name: 'my-secret', key: 'SECRET_VAL' },
          },
        },
      ],
    });

    const result = await fetchNotebookEnvVariables(notebook);

    expect(result).toEqual([
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'my-secret',
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: 'SECRET_VAL', value: '' }],
        },
      },
    ]);
  });

  it('should group multiple keys from the same secret', async () => {
    const notebook = mockNotebookK8sResource({
      envFrom: [],
      additionalEnvs: [
        {
          name: 'KEY_A',
          valueFrom: { secretKeyRef: { name: 'shared-secret', key: 'KEY_A' } },
        },
        {
          name: 'KEY_B',
          valueFrom: { secretKeyRef: { name: 'shared-secret', key: 'KEY_B' } },
        },
        {
          name: 'OTHER',
          valueFrom: { secretKeyRef: { name: 'other-secret', key: 'OTHER' } },
        },
      ],
    });

    const result = await fetchNotebookEnvVariables(notebook);

    expect(result).toEqual([
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'shared-secret',
        values: {
          category: SecretCategory.EXISTING,
          data: [
            { key: 'KEY_A', value: '' },
            { key: 'KEY_B', value: '' },
          ],
        },
      },
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'other-secret',
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: 'OTHER', value: '' }],
        },
      },
    ]);
  });

  it('should merge envFrom-based and env-based secret references', async () => {
    const mockSecret = mockCustomSecretK8sResource({
      name: 'envfrom-secret',
      namespace: 'test-project',
      data: { foo: btoa('bar') },
      type: 'Opaque',
    });

    getSecretMock.mockResolvedValue(mockSecret);

    const notebook = mockNotebookK8sResource({
      envFrom: [{ secretRef: { name: 'envfrom-secret' } }],
      additionalEnvs: [
        {
          name: 'EXISTING_KEY',
          valueFrom: { secretKeyRef: { name: 'existing-secret', key: 'EXISTING_KEY' } },
        },
      ],
    });

    const result = await fetchNotebookEnvVariables(notebook);

    // Should include both the envFrom-based secret and the env-based existing secret
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      type: EnvironmentVariableType.SECRET,
      existingName: 'envfrom-secret',
      values: {
        category: SecretCategory.GENERIC,
        data: [{ key: 'foo', value: 'bar' }],
      },
    });
    expect(result[1]).toEqual({
      type: EnvironmentVariableType.SECRET,
      existingName: 'existing-secret',
      values: {
        category: SecretCategory.EXISTING,
        data: [{ key: 'EXISTING_KEY', value: '' }],
      },
    });
  });

  it('should return empty array when no env or envFrom entries exist', async () => {
    const notebook = mockNotebookK8sResource({
      envFrom: [],
      additionalEnvs: [],
    });

    const result = await fetchNotebookEnvVariables(notebook);

    expect(result).toEqual([]);
  });

  it('should handle notebook with only envFrom (existing behavior)', async () => {
    const mockSecret = mockCustomSecretK8sResource({
      name: 'my-secret',
      namespace: 'test-project',
      data: { username: btoa('admin') },
      type: 'Opaque',
    });

    getSecretMock.mockResolvedValue(mockSecret);

    const notebook = mockNotebookK8sResource({
      envFrom: [{ secretRef: { name: 'my-secret' } }],
      additionalEnvs: [],
    });

    const result = await fetchNotebookEnvVariables(notebook);

    expect(result).toEqual([
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'my-secret',
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'username', value: 'admin' }],
        },
      },
    ]);
  });
});
