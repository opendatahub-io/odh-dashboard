import { mockNotebookK8sResource } from '#~/__mocks__/mockNotebookK8sResource';
import { EnvironmentVariableType, EnvVariable, SecretCategory } from '#~/pages/projects/types';
import {
  fetchNotebookEnvVariables,
  parseSecretKeyRefEntries,
} from '#~/pages/projects/screens/spawner/environmentVariables/useNotebookEnvVariables';

jest.mock('#~/api', () => ({
  getConfigMap: jest.fn(),
  getSecret: jest.fn(),
}));

jest.mock('#~/concepts/connectionTypes/utils', () => ({
  isConnection: jest.fn().mockReturnValue(false),
}));

describe('parseSecretKeyRefEntries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when there are no env entries', () => {
    const notebook = mockNotebookK8sResource({ additionalEnvs: [] });
    const result = parseSecretKeyRefEntries(notebook);
    expect(result).toEqual([]);
  });

  it('should return empty array when no entries have secretKeyRef', () => {
    const notebook = mockNotebookK8sResource({
      additionalEnvs: [{ name: 'CUSTOM_VAR', value: 'custom-value' }],
    });
    const result = parseSecretKeyRefEntries(notebook);
    expect(result).toEqual([]);
  });

  it('should parse a single secretKeyRef entry', () => {
    const notebook = mockNotebookK8sResource({
      additionalEnvs: [
        {
          name: 'DB_PASSWORD',
          valueFrom: {
            secretKeyRef: { name: 'db-credentials', key: 'DB_PASSWORD' },
          },
        },
      ],
    });
    const result = parseSecretKeyRefEntries(notebook);
    expect(result).toEqual([{ secretName: 'db-credentials', selectedKeys: ['DB_PASSWORD'] }]);
  });

  it('should group multiple keys from the same secret', () => {
    const notebook = mockNotebookK8sResource({
      additionalEnvs: [
        {
          name: 'AWS_ACCESS_KEY_ID',
          valueFrom: {
            secretKeyRef: { name: 'aws-credentials', key: 'AWS_ACCESS_KEY_ID' },
          },
        },
        {
          name: 'AWS_SECRET_ACCESS_KEY',
          valueFrom: {
            secretKeyRef: { name: 'aws-credentials', key: 'AWS_SECRET_ACCESS_KEY' },
          },
        },
      ],
    });
    const result = parseSecretKeyRefEntries(notebook);
    expect(result).toEqual([
      {
        secretName: 'aws-credentials',
        selectedKeys: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
      },
    ]);
  });

  it('should handle multiple different secrets', () => {
    const notebook = mockNotebookK8sResource({
      additionalEnvs: [
        {
          name: 'DB_PASSWORD',
          valueFrom: {
            secretKeyRef: { name: 'db-credentials', key: 'DB_PASSWORD' },
          },
        },
        {
          name: 'API_KEY',
          valueFrom: {
            secretKeyRef: { name: 'api-secret', key: 'API_KEY' },
          },
        },
      ],
    });
    const result = parseSecretKeyRefEntries(notebook);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      secretName: 'db-credentials',
      selectedKeys: ['DB_PASSWORD'],
    });
    expect(result).toContainEqual({
      secretName: 'api-secret',
      selectedKeys: ['API_KEY'],
    });
  });

  it('should ignore non-secretKeyRef valueFrom entries', () => {
    const notebook = mockNotebookK8sResource({
      additionalEnvs: [
        {
          name: 'NAMESPACE',
          valueFrom: {
            fieldRef: { fieldPath: 'metadata.namespace' },
          },
        },
        {
          name: 'DB_PASSWORD',
          valueFrom: {
            secretKeyRef: { name: 'db-credentials', key: 'DB_PASSWORD' },
          },
        },
      ],
    });
    const result = parseSecretKeyRefEntries(notebook);
    expect(result).toEqual([{ secretName: 'db-credentials', selectedKeys: ['DB_PASSWORD'] }]);
  });

  it('should handle mixed env entries (value and valueFrom)', () => {
    const notebook = mockNotebookK8sResource({
      additionalEnvs: [
        { name: 'STATIC_VAR', value: 'static-value' },
        {
          name: 'SECRET_VAR',
          valueFrom: {
            secretKeyRef: { name: 'my-secret', key: 'SECRET_VAR' },
          },
        },
      ],
    });
    const result = parseSecretKeyRefEntries(notebook);
    expect(result).toEqual([{ secretName: 'my-secret', selectedKeys: ['SECRET_VAR'] }]);
  });
});

describe('fetchNotebookEnvVariables', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should include EXISTING category env variable when secretKeyRef entries exist', async () => {
    const notebook = mockNotebookK8sResource({
      envFrom: [],
      additionalEnvs: [
        {
          name: 'DB_PASSWORD',
          valueFrom: {
            secretKeyRef: { name: 'db-credentials', key: 'DB_PASSWORD' },
          },
        },
      ],
    });

    const result = await fetchNotebookEnvVariables(notebook);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: EnvironmentVariableType.SECRET,
      values: { category: SecretCategory.EXISTING, data: [] },
      existingSecretRefs: [{ secretName: 'db-credentials', selectedKeys: ['DB_PASSWORD'] }],
    });
  });

  it('should not include EXISTING env variable when no secretKeyRef entries exist', async () => {
    const notebook = mockNotebookK8sResource({
      envFrom: [],
      additionalEnvs: [],
    });

    const result = await fetchNotebookEnvVariables(notebook);

    const existingRefs = result.filter(
      (v: EnvVariable) => v.values?.category === SecretCategory.EXISTING,
    );
    expect(existingRefs).toHaveLength(0);
  });

  it('should group multiple secretKeyRef entries into a single EXISTING env variable', async () => {
    const notebook = mockNotebookK8sResource({
      envFrom: [],
      additionalEnvs: [
        {
          name: 'KEY_1',
          valueFrom: {
            secretKeyRef: { name: 'secret-a', key: 'KEY_1' },
          },
        },
        {
          name: 'KEY_2',
          valueFrom: {
            secretKeyRef: { name: 'secret-a', key: 'KEY_2' },
          },
        },
        {
          name: 'KEY_3',
          valueFrom: {
            secretKeyRef: { name: 'secret-b', key: 'KEY_3' },
          },
        },
      ],
    });

    const result = await fetchNotebookEnvVariables(notebook);

    const existingRefs = result.filter(
      (v: EnvVariable) => v.values?.category === SecretCategory.EXISTING,
    );
    expect(existingRefs).toHaveLength(1);
    expect(existingRefs[0].existingSecretRefs).toHaveLength(2);
    expect(existingRefs[0].existingSecretRefs).toContainEqual({
      secretName: 'secret-a',
      selectedKeys: ['KEY_1', 'KEY_2'],
    });
    expect(existingRefs[0].existingSecretRefs).toContainEqual({
      secretName: 'secret-b',
      selectedKeys: ['KEY_3'],
    });
  });
});
