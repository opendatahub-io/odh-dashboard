import { NotebookKind } from '#~/k8sTypes';
import { EnvironmentVariableType } from '#~/pages/projects/types';
import {
  getSecretKeyRef,
  parseExistingSecretKeyRefs,
} from '#~/pages/projects/screens/spawner/environmentVariables/useNotebookEnvVariables';

describe('getSecretKeyRef', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return undefined for undefined valueFrom', () => {
    expect(getSecretKeyRef(undefined)).toBeUndefined();
  });

  it('should return undefined for non-object valueFrom', () => {
    expect(getSecretKeyRef('string' as unknown as Record<string, unknown>)).toBeUndefined();
  });

  it('should return undefined when secretKeyRef is missing', () => {
    expect(getSecretKeyRef({ configMapKeyRef: { name: 'cm', key: 'k' } })).toBeUndefined();
  });

  it('should return undefined when secretKeyRef is not an object', () => {
    expect(getSecretKeyRef({ secretKeyRef: 'invalid' })).toBeUndefined();
  });

  it('should return undefined when secretKeyRef lacks name', () => {
    expect(getSecretKeyRef({ secretKeyRef: { key: 'k' } })).toBeUndefined();
  });

  it('should return undefined when secretKeyRef lacks key', () => {
    expect(getSecretKeyRef({ secretKeyRef: { name: 'n' } })).toBeUndefined();
  });

  it('should return name and key for valid secretKeyRef', () => {
    expect(getSecretKeyRef({ secretKeyRef: { name: 'my-secret', key: 'DB_HOST' } })).toEqual({
      name: 'my-secret',
      key: 'DB_HOST',
    });
  });
});

describe('parseExistingSecretKeyRefs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeNotebook = (env: Record<string, unknown>[]): NotebookKind =>
    ({
      metadata: { name: 'test-nb', namespace: 'test-project' },
      spec: {
        template: {
          spec: {
            containers: [{ env }],
          },
        },
      },
    } as unknown as NotebookKind);

  it('should return empty array for notebook with no env entries', () => {
    const nb = makeNotebook([]);
    expect(parseExistingSecretKeyRefs(nb)).toEqual([]);
  });

  it('should return empty array for notebook with only reserved env vars', () => {
    const nb = makeNotebook([
      { name: 'NOTEBOOK_ARGS', value: '--port=8888' },
      { name: 'JUPYTER_IMAGE', value: 'image:latest' },
    ]);
    expect(parseExistingSecretKeyRefs(nb)).toEqual([]);
  });

  it('should return empty array for notebook with only plain value env vars', () => {
    const nb = makeNotebook([{ name: 'MY_VAR', value: 'hello' }]);
    expect(parseExistingSecretKeyRefs(nb)).toEqual([]);
  });

  it('should parse a single secretKeyRef entry', () => {
    const nb = makeNotebook([
      { name: 'NOTEBOOK_ARGS', value: '--port=8888' },
      { name: 'DB_HOST', valueFrom: { secretKeyRef: { name: 'db-creds', key: 'DB_HOST' } } },
    ]);
    const result = parseExistingSecretKeyRefs(nb);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe(EnvironmentVariableType.EXISTING_SECRET);
    expect(result[0].existingSecretRefs).toEqual([
      { secretName: 'db-creds', selectedKeys: ['DB_HOST'], allKeys: true },
    ]);
  });

  it('should group multiple keys from the same secret', () => {
    const nb = makeNotebook([
      { name: 'DB_HOST', valueFrom: { secretKeyRef: { name: 'db-creds', key: 'DB_HOST' } } },
      { name: 'DB_PORT', valueFrom: { secretKeyRef: { name: 'db-creds', key: 'DB_PORT' } } },
      { name: 'DB_PASS', valueFrom: { secretKeyRef: { name: 'db-creds', key: 'DB_PASS' } } },
    ]);
    const result = parseExistingSecretKeyRefs(nb);
    expect(result).toHaveLength(1);
    expect(result[0].existingSecretRefs).toHaveLength(1);
    expect(result[0].existingSecretRefs?.[0].selectedKeys).toEqual([
      'DB_HOST',
      'DB_PORT',
      'DB_PASS',
    ]);
  });

  it('should group keys from multiple secrets into separate refs', () => {
    const nb = makeNotebook([
      { name: 'DB_HOST', valueFrom: { secretKeyRef: { name: 'db-creds', key: 'DB_HOST' } } },
      { name: 'API_KEY', valueFrom: { secretKeyRef: { name: 'api-config', key: 'API_KEY' } } },
    ]);
    const result = parseExistingSecretKeyRefs(nb);
    expect(result).toHaveLength(1);
    expect(result[0].existingSecretRefs).toHaveLength(2);
    expect(result[0].existingSecretRefs?.[0].secretName).toBe('db-creds');
    expect(result[0].existingSecretRefs?.[1].secretName).toBe('api-config');
  });

  it('should skip NOTEBOOK_ARGS and JUPYTER_IMAGE even if they have secretKeyRef', () => {
    const nb = makeNotebook([
      {
        name: 'NOTEBOOK_ARGS',
        valueFrom: { secretKeyRef: { name: 'bad', key: 'NOTEBOOK_ARGS' } },
      },
      { name: 'REAL_KEY', valueFrom: { secretKeyRef: { name: 'good', key: 'REAL_KEY' } } },
    ]);
    const result = parseExistingSecretKeyRefs(nb);
    expect(result[0].existingSecretRefs).toHaveLength(1);
    expect(result[0].existingSecretRefs?.[0].secretName).toBe('good');
  });

  it('should handle notebook with undefined env gracefully', () => {
    const nb = {
      metadata: { name: 'test', namespace: 'ns' },
      spec: { template: { spec: { containers: [{}] } } },
    } as unknown as NotebookKind;
    expect(parseExistingSecretKeyRefs(nb)).toEqual([]);
  });
});
