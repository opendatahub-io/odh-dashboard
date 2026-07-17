import type { SecretKind } from '@odh-dashboard/k8s-core';
import { isExistingSecretEligible } from '#~/pages/projects/screens/spawner/environmentVariables/existingSecretUtils';

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
