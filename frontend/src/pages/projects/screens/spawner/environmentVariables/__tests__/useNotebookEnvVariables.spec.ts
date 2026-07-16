import { NotebookKind } from '#~/k8sTypes';
import { EnvironmentVariableType, SecretCategory } from '#~/pages/projects/types';
import { fetchNotebookEnvVariables } from '#~/pages/projects/screens/spawner/environmentVariables/useNotebookEnvVariables';

jest.mock('#~/api', () => ({
  getConfigMap: jest.fn(),
  getSecret: jest.fn(),
}));

jest.mock('#~/concepts/connectionTypes/utils', () => ({
  isConnection: jest.fn().mockReturnValue(false),
}));

describe('fetchNotebookEnvVariables', () => {
  it('should parse env[].valueFrom.secretKeyRef entries into EXISTING category', async () => {
    const notebook: NotebookKind = {
      apiVersion: 'kubeflow.org/v1',
      kind: 'Notebook',
      metadata: { name: 'test-nb', namespace: 'test-ns', annotations: {}, labels: {} },
      spec: {
        template: {
          spec: {
            containers: [
              {
                name: 'test',
                image: 'test',
                env: [
                  { name: 'NOTEBOOK_ARGS', value: '--ServerApp.port=8888' },
                  { name: 'JUPYTER_IMAGE', value: 'test:latest' },
                  {
                    name: 'AWS_ACCESS_KEY_ID',
                    valueFrom: { secretKeyRef: { name: 's3-creds', key: 'AWS_ACCESS_KEY_ID' } },
                  },
                  {
                    name: 'AWS_SECRET_ACCESS_KEY',
                    valueFrom: { secretKeyRef: { name: 's3-creds', key: 'AWS_SECRET_ACCESS_KEY' } },
                  },
                  {
                    name: 'DB_PASSWORD',
                    valueFrom: { secretKeyRef: { name: 'db-secret', key: 'DB_PASSWORD' } },
                  },
                ],
                envFrom: [],
              },
            ],
          },
        },
      },
    } as unknown as NotebookKind;

    const result = await fetchNotebookEnvVariables(notebook);

    // Should group by secret name
    expect(result).toEqual(
      expect.arrayContaining([
        {
          type: EnvironmentVariableType.SECRET,
          existingName: 's3-creds',
          values: {
            category: SecretCategory.EXISTING,
            data: [
              { key: 'AWS_ACCESS_KEY_ID', value: '' },
              { key: 'AWS_SECRET_ACCESS_KEY', value: '' },
            ],
          },
        },
        {
          type: EnvironmentVariableType.SECRET,
          existingName: 'db-secret',
          values: {
            category: SecretCategory.EXISTING,
            data: [{ key: 'DB_PASSWORD', value: '' }],
          },
        },
      ]),
    );
  });

  it('should exclude static env vars (NOTEBOOK_ARGS, JUPYTER_IMAGE) from parsing', async () => {
    const notebook: NotebookKind = {
      apiVersion: 'kubeflow.org/v1',
      kind: 'Notebook',
      metadata: { name: 'test-nb', namespace: 'test-ns', annotations: {}, labels: {} },
      spec: {
        template: {
          spec: {
            containers: [
              {
                name: 'test',
                image: 'test',
                env: [
                  { name: 'NOTEBOOK_ARGS', value: '--ServerApp.port=8888' },
                  { name: 'JUPYTER_IMAGE', value: 'test:latest' },
                ],
                envFrom: [],
              },
            ],
          },
        },
      },
    } as unknown as NotebookKind;

    const result = await fetchNotebookEnvVariables(notebook);
    expect(result).toEqual([]);
  });

  it('should return empty array when env is empty and envFrom is empty', async () => {
    const notebook: NotebookKind = {
      apiVersion: 'kubeflow.org/v1',
      kind: 'Notebook',
      metadata: { name: 'test-nb', namespace: 'test-ns', annotations: {}, labels: {} },
      spec: {
        template: {
          spec: {
            containers: [
              {
                name: 'test',
                image: 'test',
                env: [],
                envFrom: [],
              },
            ],
          },
        },
      },
    } as unknown as NotebookKind;

    const result = await fetchNotebookEnvVariables(notebook);
    expect(result).toEqual([]);
  });
});
