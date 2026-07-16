import { mockCustomSecretK8sResource } from '#~/__mocks__/mockSecretK8sResource';
import type { Connection } from '#~/concepts/connectionTypes/types';
import { SecretCategory, EnvironmentVariableType } from '#~/pages/projects/types';
import type { ExistingSecretRef, EnvVariable } from '#~/pages/projects/types';
import {
  filterExistingSecrets,
  getExistingSecretEnvVars,
  detectEnvKeyCollisions,
} from '#~/pages/projects/screens/spawner/environmentVariables/existingSecretUtils';

describe('SecretCategory.EXISTING enum value', () => {
  it('should have the expected string value', () => {
    expect(SecretCategory.EXISTING).toBe('secret existing');
  });

  it('should produce correct env vars when used with getExistingSecretEnvVars', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.EXISTING, data: [] },
        existingSecretRefs: [
          {
            secretName: 'my-secret',
            allKeys: true,
            selectedKeys: ['KEY_A', 'KEY_B'],
            availableKeys: ['KEY_A', 'KEY_B'],
          },
        ],
      },
    ];
    const result = getExistingSecretEnvVars(envVariables);
    expect(result).toHaveLength(2);
    expect(result[0].valueFrom.secretKeyRef.name).toBe('my-secret');
    expect(result[1].valueFrom.secretKeyRef.key).toBe('KEY_B');
  });

  it('should skip error refs when used with getExistingSecretEnvVars', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.EXISTING, data: [] },
        existingSecretRefs: [
          {
            secretName: 'deleted-secret',
            allKeys: false,
            selectedKeys: ['GONE_KEY'],
            availableKeys: [],
            error: 'not-found',
            missingKeys: ['GONE_KEY'],
          },
        ],
      },
    ];
    const result = getExistingSecretEnvVars(envVariables);
    expect(result).toEqual([]);
  });
});

describe('filterExistingSecrets', () => {
  it('should return empty array for empty input', () => {
    expect(filterExistingSecrets([])).toEqual([]);
  });

  it('should include Opaque secrets without Connection annotations', () => {
    const secret = mockCustomSecretK8sResource({
      name: 'plain-secret',
      namespace: 'test-ns',
      data: { KEY_A: 'dmFsdWU=' },
      type: 'Opaque',
      labels: {},
      annotations: {},
    });
    const result = filterExistingSecrets([secret]);
    expect(result).toHaveLength(1);
    expect(result[0].metadata.name).toBe('plain-secret');
  });

  it('should exclude non-Opaque secrets', () => {
    const secret = mockCustomSecretK8sResource({
      name: 'sa-token',
      namespace: 'test-ns',
      data: { token: 'dmFsdWU=' },
      type: 'kubernetes.io/service-account-token',
      labels: {},
      annotations: {},
    });
    const result = filterExistingSecrets([secret]);
    expect(result).toHaveLength(0);
  });

  it('should exclude Connection secrets with connection-type annotation', () => {
    const secret = mockCustomSecretK8sResource({
      name: 'conn-secret',
      namespace: 'test-ns',
      data: { KEY: 'dmFsdWU=' },
      type: 'Opaque',
      labels: { 'opendatahub.io/dashboard': 'true' },
      annotations: {
        'opendatahub.io/connection-type': 's3',
      },
    });
    const result = filterExistingSecrets([secret]);
    expect(result).toHaveLength(0);
  });

  it('should exclude secrets with connection-type-protocol annotation', () => {
    const secret = mockCustomSecretK8sResource({
      name: 'protocol-secret',
      namespace: 'test-ns',
      data: { KEY: 'dmFsdWU=' },
      type: 'Opaque',
      labels: {},
      annotations: {
        'opendatahub.io/connection-type-protocol': 'grpc',
      },
    });
    const result = filterExistingSecrets([secret]);
    expect(result).toHaveLength(0);
  });

  it('should exclude secrets with connection-type-ref annotation and dashboard label', () => {
    const secret = mockCustomSecretK8sResource({
      name: 'ref-secret',
      namespace: 'test-ns',
      data: { KEY: 'dmFsdWU=' },
      type: 'Opaque',
      labels: { 'opendatahub.io/dashboard': 'true' },
      annotations: {
        'opendatahub.io/connection-type-ref': 'some-type',
      },
    });
    const result = filterExistingSecrets([secret]);
    expect(result).toHaveLength(0);
  });

  it('should include dashboard-labeled Opaque secrets that are not Connections', () => {
    const secret = mockCustomSecretK8sResource({
      name: 'dashboard-secret',
      namespace: 'test-ns',
      data: { MY_KEY: 'dmFsdWU=' },
      type: 'Opaque',
      labels: { 'opendatahub.io/dashboard': 'true' },
      annotations: {},
    });
    const result = filterExistingSecrets([secret]);
    expect(result).toHaveLength(1);
  });
});

describe('getExistingSecretEnvVars', () => {
  it('should convert refs with selected keys to secretKeyRef entries', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.EXISTING, data: [] },
        existingSecretRefs: [
          {
            secretName: 'my-secret',
            allKeys: false,
            selectedKeys: ['DB_HOST', 'DB_PORT'],
            availableKeys: ['DB_HOST', 'DB_PORT', 'DB_NAME'],
          },
        ],
      },
    ];
    const result = getExistingSecretEnvVars(envVariables);
    expect(result).toEqual([
      { name: 'DB_HOST', valueFrom: { secretKeyRef: { name: 'my-secret', key: 'DB_HOST' } } },
      { name: 'DB_PORT', valueFrom: { secretKeyRef: { name: 'my-secret', key: 'DB_PORT' } } },
    ]);
  });

  it('should skip refs with error not-found', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.EXISTING, data: [] },
        existingSecretRefs: [
          {
            secretName: 'deleted-secret',
            allKeys: false,
            selectedKeys: ['KEY'],
            availableKeys: [],
            error: 'not-found',
          },
        ],
      },
    ];
    const result = getExistingSecretEnvVars(envVariables);
    expect(result).toEqual([]);
  });

  it('should handle multiple secrets with all keys', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.EXISTING, data: [] },
        existingSecretRefs: [
          {
            secretName: 'secret-a',
            allKeys: true,
            selectedKeys: ['A1', 'A2'],
            availableKeys: ['A1', 'A2'],
          },
          {
            secretName: 'secret-b',
            allKeys: true,
            selectedKeys: ['B1'],
            availableKeys: ['B1'],
          },
        ],
      },
    ];
    const result = getExistingSecretEnvVars(envVariables);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      name: 'A1',
      valueFrom: { secretKeyRef: { name: 'secret-a', key: 'A1' } },
    });
  });

  it('should ignore non-EXISTING category env variables', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.GENERIC, data: [{ key: 'FOO', value: 'bar' }] },
      },
    ];
    const result = getExistingSecretEnvVars(envVariables);
    expect(result).toEqual([]);
  });

  it('should produce no env entries for ref with empty selectedKeys', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.EXISTING, data: [] },
        existingSecretRefs: [
          {
            secretName: 'empty-selection',
            allKeys: false,
            selectedKeys: [],
            availableKeys: ['KEY_A', 'KEY_B'],
          },
        ],
      },
    ];
    const result = getExistingSecretEnvVars(envVariables);
    expect(result).toEqual([]);
  });
});

describe('detectEnvKeyCollisions', () => {
  it('should detect collision between two existing secrets', () => {
    const refs: ExistingSecretRef[] = [
      {
        secretName: 'secret-a',
        allKeys: true,
        selectedKeys: ['SHARED_KEY', 'UNIQUE_A'],
        availableKeys: ['SHARED_KEY', 'UNIQUE_A'],
      },
      {
        secretName: 'secret-b',
        allKeys: true,
        selectedKeys: ['SHARED_KEY', 'UNIQUE_B'],
        availableKeys: ['SHARED_KEY', 'UNIQUE_B'],
      },
    ];
    const result = detectEnvKeyCollisions(refs, [], []);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('SHARED_KEY');
    expect(result[0].sources).toHaveLength(2);
  });

  it('should detect collision between existing secret and inline secret', () => {
    const refs: ExistingSecretRef[] = [
      {
        secretName: 'ext-secret',
        allKeys: true,
        selectedKeys: ['DB_HOST'],
        availableKeys: ['DB_HOST'],
      },
    ];
    const inlineVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'inline-secret',
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'DB_HOST', value: 'localhost' }],
        },
      },
    ];
    const result = detectEnvKeyCollisions(refs, inlineVars, []);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('DB_HOST');
    expect(result[0].sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'existing-secret' }),
        expect.objectContaining({ type: 'inline-secret' }),
      ]),
    );
  });

  it('should detect collision between existing secret and connection', () => {
    const refs: ExistingSecretRef[] = [
      {
        secretName: 'ext-secret',
        allKeys: true,
        selectedKeys: ['AWS_ACCESS_KEY_ID'],
        availableKeys: ['AWS_ACCESS_KEY_ID'],
      },
    ];
    const connections = [
      {
        metadata: {
          name: 's3-conn',
          namespace: 'test-ns',
          annotations: { 'openshift.io/display-name': 'My S3' },
        },
        data: { AWS_ACCESS_KEY_ID: 'encoded' },
      },
    ] as unknown as Connection[];
    const result = detectEnvKeyCollisions(refs, [], connections);
    expect(result).toHaveLength(1);
    expect(result[0].sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'existing-secret' }),
        expect.objectContaining({ type: 'connection', name: 'My S3' }),
      ]),
    );
  });

  it('should return empty array when no collisions', () => {
    const refs: ExistingSecretRef[] = [
      {
        secretName: 'secret-a',
        allKeys: true,
        selectedKeys: ['UNIQUE_A'],
        availableKeys: ['UNIQUE_A'],
      },
    ];
    const result = detectEnvKeyCollisions(refs, [], []);
    expect(result).toEqual([]);
  });

  it('should skip errored refs', () => {
    const refs: ExistingSecretRef[] = [
      {
        secretName: 'deleted',
        allKeys: false,
        selectedKeys: ['KEY'],
        availableKeys: [],
        error: 'not-found',
      },
      {
        secretName: 'good',
        allKeys: true,
        selectedKeys: ['KEY'],
        availableKeys: ['KEY'],
      },
    ];
    const result = detectEnvKeyCollisions(refs, [], []);
    expect(result).toEqual([]);
  });
});
