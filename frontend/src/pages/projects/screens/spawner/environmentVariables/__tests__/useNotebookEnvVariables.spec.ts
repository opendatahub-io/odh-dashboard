import { act } from '@testing-library/react';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import { ConfigMapKind, NotebookKind } from '#~/k8sTypes';
import * as api from '#~/api';
import {
  EnvironmentVariableType,
  SecretCategory,
  ConfigMapCategory,
} from '#~/pages/projects/types';
import {
  fetchNotebookEnvVariables,
  useNotebookEnvVariables,
} from '#~/pages/projects/screens/spawner/environmentVariables/useNotebookEnvVariables';

jest.mock('#~/api', () => ({
  getConfigMap: jest.fn(),
  getSecret: jest.fn(),
}));

const mockGetConfigMap = jest.mocked(api.getConfigMap);
const mockGetSecret = jest.mocked(api.getSecret);

const createMockNotebook = (envFrom: unknown[] = [], env: unknown[] = []): NotebookKind =>
  ({
    metadata: {
      name: 'test-notebook',
      namespace: 'test-namespace',
    },
    spec: {
      template: {
        spec: {
          containers: [
            {
              name: 'test-container',
              envFrom,
              env,
            },
          ],
        },
      },
    },
  } as NotebookKind);

describe('fetchNotebookEnvVariables', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array for notebook with no env variables', async () => {
    const notebook = createMockNotebook();
    const result = await fetchNotebookEnvVariables(notebook);
    expect(result).toEqual([]);
  });

  it('should fetch configMap from envFrom entries', async () => {
    const mockConfigMap: Partial<ConfigMapKind> = {
      kind: 'ConfigMap',
      metadata: { name: 'test-config', namespace: 'test-namespace' },
      data: { key1: 'value1', key2: 'value2' },
    };

    mockGetConfigMap.mockResolvedValue(mockConfigMap as ConfigMapKind);

    const notebook = createMockNotebook([{ configMapRef: { name: 'test-config' } }]);
    const result = await fetchNotebookEnvVariables(notebook);

    expect(mockGetConfigMap).toHaveBeenCalledWith('test-namespace', 'test-config');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: EnvironmentVariableType.CONFIG_MAP,
      existingName: 'test-config',
      values: {
        category: ConfigMapCategory.GENERIC,
        data: [
          { key: 'key1', value: 'value1' },
          { key: 'key2', value: 'value2' },
        ],
      },
    });
  });

  it('should fetch secret from envFrom entries', async () => {
    const mockSecret: Partial<SecretKind> = {
      kind: 'Secret',
      metadata: { name: 'test-secret', namespace: 'test-namespace' },
      data: { key1: btoa('secret1'), key2: btoa('secret2') },
    };

    mockGetSecret.mockResolvedValue(mockSecret as SecretKind);

    const notebook = createMockNotebook([{ secretRef: { name: 'test-secret' } }]);
    const result = await fetchNotebookEnvVariables(notebook);

    expect(mockGetSecret).toHaveBeenCalledWith('test-namespace', 'test-secret');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: EnvironmentVariableType.SECRET,
      existingName: 'test-secret',
      values: {
        category: SecretCategory.GENERIC,
        data: [
          { key: 'key1', value: 'secret1' },
          { key: 'key2', value: 'secret2' },
        ],
      },
    });
  });

  it('should parse secretKeyRef entries from env array and group by secret name', async () => {
    const notebook = createMockNotebook(
      [],
      [
        { name: 'DB_HOST', valueFrom: { secretKeyRef: { name: 'db-secret', key: 'host' } } },
        { name: 'DB_PORT', valueFrom: { secretKeyRef: { name: 'db-secret', key: 'port' } } },
        { name: 'API_KEY', valueFrom: { secretKeyRef: { name: 'api-secret', key: 'key' } } },
      ],
    );

    const result = await fetchNotebookEnvVariables(notebook);

    expect(result).toHaveLength(2);

    const dbSecretVar = result.find((v) => v.existingName === 'db-secret');
    expect(dbSecretVar).toEqual({
      type: EnvironmentVariableType.SECRET,
      existingName: 'db-secret',
      values: {
        category: SecretCategory.EXISTING,
        data: [],
      },
      existingSecretRefs: [
        {
          secretName: 'db-secret',
          selectedKeys: ['host', 'port'],
          allKeys: false,
        },
      ],
    });

    const apiSecretVar = result.find((v) => v.existingName === 'api-secret');
    expect(apiSecretVar).toEqual({
      type: EnvironmentVariableType.SECRET,
      existingName: 'api-secret',
      values: {
        category: SecretCategory.EXISTING,
        data: [],
      },
      existingSecretRefs: [
        {
          secretName: 'api-secret',
          selectedKeys: ['key'],
          allKeys: false,
        },
      ],
    });
  });

  it('should handle mixed envFrom and secretKeyRef entries', async () => {
    const mockConfigMap: Partial<ConfigMapKind> = {
      kind: 'ConfigMap',
      metadata: { name: 'app-config', namespace: 'test-namespace' },
      data: { setting1: 'value1' },
    };

    mockGetConfigMap.mockResolvedValue(mockConfigMap as ConfigMapKind);

    const notebook = createMockNotebook(
      [{ configMapRef: { name: 'app-config' } }],
      [{ name: 'DB_HOST', valueFrom: { secretKeyRef: { name: 'db-secret', key: 'host' } } }],
    );

    const result = await fetchNotebookEnvVariables(notebook);

    expect(result).toHaveLength(2);

    const configMapVar = result.find((v) => v.type === EnvironmentVariableType.CONFIG_MAP);
    expect(configMapVar).toEqual({
      type: EnvironmentVariableType.CONFIG_MAP,
      existingName: 'app-config',
      values: {
        category: ConfigMapCategory.GENERIC,
        data: [{ key: 'setting1', value: 'value1' }],
      },
    });

    const secretVar = result.find((v) => v.values?.category === SecretCategory.EXISTING);
    expect(secretVar).toEqual({
      type: EnvironmentVariableType.SECRET,
      existingName: 'db-secret',
      values: {
        category: SecretCategory.EXISTING,
        data: [],
      },
      existingSecretRefs: [
        {
          secretName: 'db-secret',
          selectedKeys: ['host'],
          allKeys: false,
        },
      ],
    });
  });

  it('should skip env entries without valueFrom.secretKeyRef', async () => {
    const notebook = createMockNotebook(
      [],
      [
        { name: 'PLAIN_VAR', value: 'plain-value' },
        { name: 'DB_HOST', valueFrom: { secretKeyRef: { name: 'db-secret', key: 'host' } } },
        { name: 'CONFIG_VAR', valueFrom: { configMapKeyRef: { name: 'config', key: 'key1' } } },
      ],
    );

    const result = await fetchNotebookEnvVariables(notebook);

    // Only the secretKeyRef entry should be returned
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: EnvironmentVariableType.SECRET,
      existingName: 'db-secret',
      values: {
        category: SecretCategory.EXISTING,
        data: [],
      },
      existingSecretRefs: [
        {
          secretName: 'db-secret',
          selectedKeys: ['host'],
          allKeys: false,
        },
      ],
    });
  });

  it('should handle 404 errors for missing resources in envFrom', async () => {
    mockGetSecret.mockRejectedValue({ statusObject: { code: 404 } });

    const notebook = createMockNotebook([{ secretRef: { name: 'missing-secret' } }]);
    const result = await fetchNotebookEnvVariables(notebook);

    expect(result).toEqual([]);
  });

  it('should propagate non-404 errors', async () => {
    mockGetSecret.mockRejectedValue(new Error('Server error'));

    const notebook = createMockNotebook([{ secretRef: { name: 'test-secret' } }]);

    await expect(fetchNotebookEnvVariables(notebook)).rejects.toThrow('Server error');
  });
});

describe('useNotebookEnvVariables', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when no notebook is provided', async () => {
    const renderResult = testHook(useNotebookEnvVariables)();

    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });

    const [envVariables, , loaded] = renderResult.result.current;
    expect(envVariables).toEqual([]);
    expect(loaded).toBe(false);
  });

  it('should fetch and return env variables for notebook', async () => {
    const mockConfigMap: Partial<ConfigMapKind> = {
      kind: 'ConfigMap',
      metadata: { name: 'test-config', namespace: 'test-namespace' },
      data: { key1: 'value1' },
    };

    mockGetConfigMap.mockResolvedValue(mockConfigMap as ConfigMapKind);

    const notebook = createMockNotebook([{ configMapRef: { name: 'test-config' } }]);
    const renderResult = testHook(useNotebookEnvVariables)(notebook);

    await renderResult.waitForNextUpdate();

    const [envVariables, , loaded] = renderResult.result.current;
    expect(loaded).toBe(true);
    expect(envVariables).toHaveLength(1);
    expect(envVariables[0].existingName).toBe('test-config');
  });

  it('should handle secretKeyRef entries in notebook env', async () => {
    const notebook = createMockNotebook(
      [],
      [{ name: 'DB_HOST', valueFrom: { secretKeyRef: { name: 'db-secret', key: 'host' } } }],
    );

    const renderResult = testHook(useNotebookEnvVariables)(notebook);

    await renderResult.waitForNextUpdate();

    const [envVariables, , loaded] = renderResult.result.current;
    expect(loaded).toBe(true);
    expect(envVariables).toHaveLength(1);
    expect(envVariables[0]).toEqual({
      type: EnvironmentVariableType.SECRET,
      existingName: 'db-secret',
      values: {
        category: SecretCategory.EXISTING,
        data: [],
      },
      existingSecretRefs: [
        {
          secretName: 'db-secret',
          selectedKeys: ['host'],
          allKeys: false,
        },
      ],
    });
  });
});
