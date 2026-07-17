import type { SecretKind } from '@odh-dashboard/k8s-core';
import {
  ExistingSecretRef,
  EnvironmentVariableType,
  SecretCategory,
  EnvVariable,
} from '#~/pages/projects/types';
import type { Connection } from '#~/concepts/connectionTypes/types';

import {
  isExistingSecretEligible,
  detectEnvVarConflicts,
} from '#~/pages/projects/screens/spawner/environmentVariables/existingSecretUtils';

jest.mock('@odh-dashboard/k8s-core', () => ({
  getDisplayNameFromK8sResource: (resource: {
    metadata: { annotations?: Record<string, string>; name: string };
  }) => resource.metadata.annotations?.['openshift.io/display-name'] || resource.metadata.name,
}));

const makeSecret = (overrides: Partial<SecretKind> = {}): SecretKind => ({
  apiVersion: 'v1',
  kind: 'Secret',
  metadata: {
    name: 'test-secret',
    namespace: 'test-ns',
    annotations: {},
    labels: {},
    ...overrides.metadata,
  },
  type: overrides.type,
  data: overrides.data ?? { KEY_A: 'dmFsdWU=' },
});

describe('isExistingSecretEligible', () => {
  it('should return true for Opaque secrets without connection annotations', () => {
    const secret = makeSecret({ type: 'Opaque' });
    expect(isExistingSecretEligible(secret)).toBe(true);
  });

  it('should return true for secrets with no explicit type (defaults to Opaque)', () => {
    const secret = makeSecret({ type: undefined });
    expect(isExistingSecretEligible(secret)).toBe(true);
  });

  it('should return false for non-Opaque secrets', () => {
    const secret = makeSecret({ type: 'kubernetes.io/service-account-token' });
    expect(isExistingSecretEligible(secret)).toBe(false);
  });

  it('should return false for TLS secrets', () => {
    const secret = makeSecret({ type: 'kubernetes.io/tls' });
    expect(isExistingSecretEligible(secret)).toBe(false);
  });

  it('should return false for secrets with connection-type annotation', () => {
    const secret = makeSecret({
      metadata: {
        name: 'conn-secret',
        namespace: 'test-ns',
        annotations: { 'opendatahub.io/connection-type': 's3' },
        labels: {},
      },
    });
    expect(isExistingSecretEligible(secret)).toBe(false);
  });

  it('should return false for secrets with connection-type-protocol annotation', () => {
    const secret = makeSecret({
      metadata: {
        name: 'proto-secret',
        namespace: 'test-ns',
        annotations: { 'opendatahub.io/connection-type-protocol': 'https' },
        labels: {},
      },
    });
    expect(isExistingSecretEligible(secret)).toBe(false);
  });

  it('should return false for secrets with connection-type-ref annotation', () => {
    const secret = makeSecret({
      metadata: {
        name: 'ref-secret',
        namespace: 'test-ns',
        annotations: { 'opendatahub.io/connection-type-ref': 'some-ref' },
        labels: {},
      },
    });
    expect(isExistingSecretEligible(secret)).toBe(false);
  });

  it('should return true for Opaque secrets with unrelated annotations', () => {
    const secret = makeSecret({
      type: 'Opaque',
      metadata: {
        name: 'custom-secret',
        namespace: 'test-ns',
        annotations: { 'my-app/custom': 'value' },
        labels: {},
      },
    });
    expect(isExistingSecretEligible(secret)).toBe(true);
  });
});

const makeSecretWithData = (name: string, keys: string[]): SecretKind => ({
  apiVersion: 'v1',
  kind: 'Secret',
  metadata: { name, namespace: 'test-ns', annotations: {}, labels: {} },
  data: keys.reduce<Record<string, string>>((acc, key) => {
    acc[key] = 'dmFsdWU=';
    return acc;
  }, {}),
});

const makeConnection = (name: string, keys: string[]): Connection =>
  ({
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name,
      namespace: 'test-ns',
      annotations: {
        'openshift.io/display-name': name,
        'opendatahub.io/connection-type': 's3',
      },
      labels: { 'opendatahub.io/dashboard': 'true' },
    },
    data: keys.reduce<Record<string, string>>((acc, key) => {
      acc[key] = 'dmFsdWU=';
      return acc;
    }, {}),
  } as unknown as Connection);

describe('detectEnvVarConflicts', () => {
  it('should return empty array when there are no conflicts', () => {
    const refs: ExistingSecretRef[] = [{ secretName: 'secret-a', allKeys: true, selectedKeys: [] }];
    const secrets = [makeSecretWithData('secret-a', ['KEY_A'])];
    const conflicts = detectEnvVarConflicts(refs, secrets, [], []);
    expect(conflicts).toHaveLength(0);
  });

  it('should detect conflicts between two existing secrets', () => {
    const refs: ExistingSecretRef[] = [
      { secretName: 'secret-a', allKeys: true, selectedKeys: [] },
      { secretName: 'secret-b', allKeys: true, selectedKeys: [] },
    ];
    const secrets = [
      makeSecretWithData('secret-a', ['SHARED_KEY', 'UNIQUE_A']),
      makeSecretWithData('secret-b', ['SHARED_KEY', 'UNIQUE_B']),
    ];
    const conflicts = detectEnvVarConflicts(refs, secrets, [], []);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].key).toBe('SHARED_KEY');
    expect(conflicts[0].sources).toHaveLength(2);
  });

  it('should detect conflicts between existing secret and inline secret', () => {
    const refs: ExistingSecretRef[] = [{ secretName: 'secret-a', allKeys: true, selectedKeys: [] }];
    const secrets = [makeSecretWithData('secret-a', ['MY_KEY'])];
    const inlineEnvVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'MY_KEY', value: 'some-value' }],
        },
      },
    ];
    const conflicts = detectEnvVarConflicts(refs, secrets, inlineEnvVars, []);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].key).toBe('MY_KEY');
  });

  it('should detect conflicts between existing secret and connection', () => {
    const refs: ExistingSecretRef[] = [{ secretName: 'secret-a', allKeys: true, selectedKeys: [] }];
    const secrets = [makeSecretWithData('secret-a', ['AWS_ACCESS_KEY_ID'])];
    const connections = [makeConnection('my-conn', ['AWS_ACCESS_KEY_ID'])];
    const conflicts = detectEnvVarConflicts(refs, secrets, [], connections);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].key).toBe('AWS_ACCESS_KEY_ID');
  });

  it('should use selectedKeys when allKeys is false', () => {
    const refs: ExistingSecretRef[] = [
      { secretName: 'secret-a', allKeys: false, selectedKeys: ['KEY_A'] },
      { secretName: 'secret-b', allKeys: false, selectedKeys: ['KEY_A'] },
    ];
    const secrets = [
      makeSecretWithData('secret-a', ['KEY_A', 'KEY_B']),
      makeSecretWithData('secret-b', ['KEY_A', 'KEY_C']),
    ];
    const conflicts = detectEnvVarConflicts(refs, secrets, [], []);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].key).toBe('KEY_A');
  });

  it('should return empty when selectedKeys do not overlap', () => {
    const refs: ExistingSecretRef[] = [
      { secretName: 'secret-a', allKeys: false, selectedKeys: ['KEY_A'] },
      { secretName: 'secret-b', allKeys: false, selectedKeys: ['KEY_B'] },
    ];
    const secrets = [
      makeSecretWithData('secret-a', ['KEY_A']),
      makeSecretWithData('secret-b', ['KEY_B']),
    ];
    const conflicts = detectEnvVarConflicts(refs, secrets, [], []);
    expect(conflicts).toHaveLength(0);
  });
});
