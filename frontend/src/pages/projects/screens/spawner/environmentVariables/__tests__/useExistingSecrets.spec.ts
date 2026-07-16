import type { SecretKind } from '@odh-dashboard/k8s-core';
import { isExistingSecret } from '#~/pages/projects/screens/spawner/environmentVariables/useExistingSecrets';

jest.mock('#~/api', () => ({
  getSecrets: jest.fn(),
}));

describe('isExistingSecret', () => {
  const baseSecret = (overrides: Partial<SecretKind> = {}): SecretKind =>
    ({
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: 'test-secret',
        namespace: 'test-ns',
        annotations: {},
        ...overrides.metadata,
      },
      type: 'Opaque',
      ...overrides,
    } as SecretKind);

  it('should return true for a plain Opaque secret', () => {
    expect(isExistingSecret(baseSecret())).toBe(true);
  });

  it('should return false for a non-Opaque secret', () => {
    expect(isExistingSecret(baseSecret({ type: 'kubernetes.io/service-account-token' }))).toBe(
      false,
    );
  });

  it('should return false for a secret with connection-type annotation', () => {
    expect(
      isExistingSecret(
        baseSecret({
          metadata: {
            name: 'conn-secret',
            namespace: 'test-ns',
            annotations: { 'opendatahub.io/connection-type': 's3' },
          },
        }),
      ),
    ).toBe(false);
  });

  it('should return false for a secret with connection-type-protocol annotation', () => {
    expect(
      isExistingSecret(
        baseSecret({
          metadata: {
            name: 'conn-secret',
            namespace: 'test-ns',
            annotations: { 'opendatahub.io/connection-type-protocol': 'https' },
          },
        }),
      ),
    ).toBe(false);
  });

  it('should return false for a secret with connection-type-ref annotation', () => {
    expect(
      isExistingSecret(
        baseSecret({
          metadata: {
            name: 'conn-secret',
            namespace: 'test-ns',
            annotations: { 'opendatahub.io/connection-type-ref': 'some-ref' },
          },
        }),
      ),
    ).toBe(false);
  });

  it('should return true when annotations object exists but has no connection annotations', () => {
    expect(
      isExistingSecret(
        baseSecret({
          metadata: {
            name: 'labeled-secret',
            namespace: 'test-ns',
            annotations: { 'some-other-annotation': 'value' },
          },
        }),
      ),
    ).toBe(true);
  });

  it('should return true when metadata has no annotations', () => {
    const secret = baseSecret();
    delete (secret.metadata as Record<string, unknown>).annotations;
    expect(isExistingSecret(secret)).toBe(true);
  });
});
