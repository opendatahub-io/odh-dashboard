import { NotebookKind } from '#~/k8sTypes';
import { EnvironmentVariableType, SecretCategory } from '#~/pages/projects/types';
import { fetchNotebookEnvVariables } from '#~/pages/projects/screens/spawner/environmentVariables/useNotebookEnvVariables';

// Mock the API calls that fetchNotebookEnvVariables uses
jest.mock('#~/api', () => ({
  getConfigMap: jest.fn(),
  getSecret: jest.fn(),
}));

// Mock connectionTypes/utils to avoid lodash-es ESM issue
jest.mock('#~/concepts/connectionTypes/utils', () => ({
  isConnection: jest.fn().mockReturnValue(false),
}));

// Mock the local utils to avoid @odh-dashboard/k8s-core lodash-es ESM issue
jest.mock('#~/pages/projects/screens/spawner/environmentVariables/utils', () => ({
  isSecretKind: jest.fn().mockReturnValue(false),
  getDeletedConfigMapOrSecretVariables: jest.fn().mockReturnValue({
    deletedConfigMaps: [],
    deletedSecrets: [],
  }),
}));

const makeNotebook = (overrides: {
  envFrom?: Array<{ secretRef?: { name: string }; configMapRef?: { name: string } }>;
  env?: Array<{
    name: string;
    value?: string;
    valueFrom?: { secretKeyRef?: { name: string; key: string } };
  }>;
}): NotebookKind =>
  ({
    apiVersion: 'kubeflow.org/v1',
    kind: 'Notebook',
    metadata: { name: 'test-wb', namespace: 'test-ns' },
    spec: {
      template: {
        spec: {
          containers: [
            {
              name: 'test-wb',
              envFrom: overrides.envFrom || [],
              env: overrides.env || [],
            },
          ],
        },
      },
    },
  } as unknown as NotebookKind);

describe('fetchNotebookEnvVariables - secretKeyRef parsing', () => {
  it('should parse secretKeyRef entries into an EXISTING category EnvVariable', async () => {
    const notebook = makeNotebook({
      env: [
        {
          name: 'DB_HOST',
          valueFrom: { secretKeyRef: { name: 'db-secret', key: 'DB_HOST' } },
        },
        {
          name: 'DB_PORT',
          valueFrom: { secretKeyRef: { name: 'db-secret', key: 'DB_PORT' } },
        },
      ],
    });
    const result = await fetchNotebookEnvVariables(notebook);
    const existingVars = result.filter((v) => v.values?.category === SecretCategory.EXISTING);
    expect(existingVars).toHaveLength(1);
    expect(existingVars[0].type).toBe(EnvironmentVariableType.SECRET);
    expect(existingVars[0].values?.existingSecretRefs).toHaveLength(1);
    expect(existingVars[0].values?.existingSecretRefs?.[0].secretName).toBe('db-secret');
    expect(existingVars[0].values?.existingSecretRefs?.[0].selectedKeys).toEqual([
      'DB_HOST',
      'DB_PORT',
    ]);
    expect(existingVars[0].values?.existingSecretRefs?.[0].allKeys).toBe(false);
  });

  it('should group secretKeyRef entries by secret name', async () => {
    const notebook = makeNotebook({
      env: [
        {
          name: 'KEY_A',
          valueFrom: { secretKeyRef: { name: 'secret-1', key: 'KEY_A' } },
        },
        {
          name: 'KEY_B',
          valueFrom: { secretKeyRef: { name: 'secret-2', key: 'KEY_B' } },
        },
      ],
    });
    const result = await fetchNotebookEnvVariables(notebook);
    const existingVars = result.filter((v) => v.values?.category === SecretCategory.EXISTING);
    expect(existingVars).toHaveLength(1);
    expect(existingVars[0].values?.existingSecretRefs).toHaveLength(2);
  });

  it('should return empty when no secretKeyRef entries exist', async () => {
    const notebook = makeNotebook({
      env: [
        { name: 'NOTEBOOK_ARGS', value: '--ServerApp.port=8888' },
        { name: 'JUPYTER_IMAGE', value: 'image:tag' },
      ],
    });
    const result = await fetchNotebookEnvVariables(notebook);
    const existingVars = result.filter((v) => v.values?.category === SecretCategory.EXISTING);
    expect(existingVars).toHaveLength(0);
  });

  it('should ignore env entries without valueFrom', async () => {
    const notebook = makeNotebook({
      env: [
        { name: 'PLAIN_VAR', value: 'plain-value' },
        {
          name: 'SECRET_VAR',
          valueFrom: { secretKeyRef: { name: 'my-secret', key: 'SECRET_VAR' } },
        },
      ],
    });
    const result = await fetchNotebookEnvVariables(notebook);
    const existingVars = result.filter((v) => v.values?.category === SecretCategory.EXISTING);
    expect(existingVars).toHaveLength(1);
    expect(existingVars[0].values?.existingSecretRefs?.[0].selectedKeys).toEqual(['SECRET_VAR']);
  });
});
