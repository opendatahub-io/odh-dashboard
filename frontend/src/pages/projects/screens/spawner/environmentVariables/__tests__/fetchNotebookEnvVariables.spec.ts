import { SecretCategory } from '#~/pages/projects/types';
import type { NotebookKind } from '#~/k8sTypes';
import { K8sStatusError } from '#~/api/errorUtils';
import { fetchNotebookEnvVariables } from '#~/pages/projects/screens/spawner/environmentVariables/useNotebookEnvVariables';

jest.mock('#~/api', () => ({
  ...jest.requireActual('#~/api'),
  getConfigMap: jest.fn(),
  getSecret: jest.fn(),
}));

const { getSecret } = jest.mocked(jest.requireMock<typeof import('#~/api')>('#~/api'));

const makeNotebook = (
  env: Array<{ name: string; value?: string; valueFrom?: unknown }> = [],
): NotebookKind =>
  ({
    metadata: { namespace: 'test-ns', name: 'nb' },
    spec: {
      template: {
        spec: {
          containers: [{ env, envFrom: [] }],
        },
      },
    },
  } as unknown as NotebookKind);

describe('fetchNotebookEnvVariables - secretKeyRef parsing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should parse secretKeyRef entries and group by secret name', async () => {
    getSecret.mockResolvedValue({
      metadata: { name: 'my-secret', namespace: 'test-ns' },
      data: { DB_HOST: 'aG9zdA==', DB_PORT: 'NTQzMg==' },
      kind: 'Secret',
      apiVersion: 'v1',
    } as never);

    const notebook = makeNotebook([
      { name: 'NOTEBOOK_ARGS', value: '--ServerApp.port=8888' },
      { name: 'JUPYTER_IMAGE', value: 'image:tag' },
      { name: 'DB_HOST', valueFrom: { secretKeyRef: { name: 'my-secret', key: 'DB_HOST' } } },
      { name: 'DB_PORT', valueFrom: { secretKeyRef: { name: 'my-secret', key: 'DB_PORT' } } },
    ]);

    const result = await fetchNotebookEnvVariables(notebook);

    const existingEntry = result.find((ev) => ev.values?.category === SecretCategory.EXISTING);
    expect(existingEntry).toBeDefined();
    expect(existingEntry?.existingSecretRefs).toHaveLength(1);

    const ref = existingEntry?.existingSecretRefs?.[0];
    expect(ref?.secretName).toBe('my-secret');
    expect(ref?.selectedKeys).toEqual(['DB_HOST', 'DB_PORT']);
    expect(ref?.availableKeys).toEqual(['DB_HOST', 'DB_PORT']);
    expect(ref?.allKeys).toBe(true);
  });

  it('should handle 404 (deleted secret) and set error to not-found', async () => {
    const notFoundError = new K8sStatusError({
      kind: 'Status',
      apiVersion: 'v1',
      status: 'Failure',
      message: 'secrets "gone-secret" not found',
      reason: 'NotFound',
      code: 404,
    });
    getSecret.mockRejectedValue(notFoundError);

    const notebook = makeNotebook([
      { name: 'NOTEBOOK_ARGS', value: '--ServerApp.port=8888' },
      { name: 'KEY', valueFrom: { secretKeyRef: { name: 'gone-secret', key: 'KEY' } } },
    ]);

    const result = await fetchNotebookEnvVariables(notebook);

    const existingEntry = result.find((ev) => ev.values?.category === SecretCategory.EXISTING);
    expect(existingEntry).toBeDefined();
    expect(existingEntry?.existingSecretRefs).toHaveLength(1);

    const ref = existingEntry?.existingSecretRefs?.[0];
    expect(ref?.error).toBe('not-found');
    expect(ref?.allKeys).toBe(false);
    expect(ref?.availableKeys).toEqual([]);
  });

  it('should detect missing keys when secret has fewer keys than referenced', async () => {
    getSecret.mockResolvedValue({
      metadata: { name: 'changed-secret', namespace: 'test-ns' },
      data: { STILL_HERE: 'dmFsdWU=' },
      kind: 'Secret',
      apiVersion: 'v1',
    } as never);

    const notebook = makeNotebook([
      { name: 'NOTEBOOK_ARGS', value: '--ServerApp.port=8888' },
      {
        name: 'STILL_HERE',
        valueFrom: { secretKeyRef: { name: 'changed-secret', key: 'STILL_HERE' } },
      },
      {
        name: 'GONE_KEY',
        valueFrom: { secretKeyRef: { name: 'changed-secret', key: 'GONE_KEY' } },
      },
    ]);

    const result = await fetchNotebookEnvVariables(notebook);

    const existingEntry = result.find((ev) => ev.values?.category === SecretCategory.EXISTING);
    expect(existingEntry).toBeDefined();

    const ref = existingEntry?.existingSecretRefs?.[0];
    expect(ref?.missingKeys).toEqual(['GONE_KEY']);
    expect(ref?.allKeys).toBe(false);
  });

  it('should filter out system env names (NOTEBOOK_ARGS, JUPYTER_IMAGE)', async () => {
    const notebook = makeNotebook([
      { name: 'NOTEBOOK_ARGS', value: '--ServerApp.port=8888' },
      { name: 'JUPYTER_IMAGE', value: 'image:tag' },
    ]);

    const result = await fetchNotebookEnvVariables(notebook);

    const existingEntry = result.find((ev) => ev.values?.category === SecretCategory.EXISTING);
    expect(existingEntry).toBeUndefined();
  });

  it('should handle env being undefined (null guard)', async () => {
    const notebook = {
      metadata: { namespace: 'test-ns', name: 'nb' },
      spec: {
        template: {
          spec: {
            containers: [{ envFrom: [] }],
          },
        },
      },
    } as unknown as NotebookKind;

    const result = await fetchNotebookEnvVariables(notebook);

    const existingEntry = result.find((ev) => ev.values?.category === SecretCategory.EXISTING);
    expect(existingEntry).toBeUndefined();
  });

  it('should group entries from multiple secrets into separate refs', async () => {
    getSecret
      .mockResolvedValueOnce({
        metadata: { name: 'secret-a', namespace: 'test-ns' },
        data: { A1: 'dmFsdWU=' },
        kind: 'Secret',
        apiVersion: 'v1',
      } as never)
      .mockResolvedValueOnce({
        metadata: { name: 'secret-b', namespace: 'test-ns' },
        data: { B1: 'dmFsdWU=', B2: 'dmFsdWU=' },
        kind: 'Secret',
        apiVersion: 'v1',
      } as never);

    const notebook = makeNotebook([
      { name: 'NOTEBOOK_ARGS', value: '--ServerApp.port=8888' },
      { name: 'A1', valueFrom: { secretKeyRef: { name: 'secret-a', key: 'A1' } } },
      { name: 'B1', valueFrom: { secretKeyRef: { name: 'secret-b', key: 'B1' } } },
    ]);

    const result = await fetchNotebookEnvVariables(notebook);

    const existingEntry = result.find((ev) => ev.values?.category === SecretCategory.EXISTING);
    expect(existingEntry).toBeDefined();
    expect(existingEntry?.existingSecretRefs).toHaveLength(2);
    expect(existingEntry?.existingSecretRefs?.[0].secretName).toBe('secret-a');
    expect(existingEntry?.existingSecretRefs?.[1].secretName).toBe('secret-b');
  });
});
