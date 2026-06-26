import { mockCustomSecretK8sResource } from '#~/__mocks__/mockSecretK8sResource';
import { KnownLabels } from '#~/k8sTypes';
import {
  isConnectionSecret,
  isDashboardSecret,
} from '#~/pages/projects/screens/spawner/environmentVariables/useExistingSecrets';

describe('isConnectionSecret', () => {
  it('should return true for secrets with connection-type-protocol annotation', () => {
    const secret = mockCustomSecretK8sResource({
      name: 'my-conn',
      namespace: 'ns',
      data: { key: 'val' },
      annotations: { 'opendatahub.io/connection-type-protocol': 's3' },
    });
    expect(isConnectionSecret(secret)).toBe(true);
  });

  it('should return true for secrets with connection-type-ref annotation', () => {
    const secret = mockCustomSecretK8sResource({
      name: 'my-conn',
      namespace: 'ns',
      data: { key: 'val' },
      annotations: { 'opendatahub.io/connection-type-ref': 'some-type' },
    });
    expect(isConnectionSecret(secret)).toBe(true);
  });

  it('should return true when both connection annotations are present', () => {
    const secret = mockCustomSecretK8sResource({
      name: 'my-conn',
      namespace: 'ns',
      data: { key: 'val' },
      annotations: {
        'opendatahub.io/connection-type-protocol': 's3',
        'opendatahub.io/connection-type-ref': 'some-type',
      },
    });
    expect(isConnectionSecret(secret)).toBe(true);
  });

  it('should return false for secrets with no connection annotations', () => {
    const secret = mockCustomSecretK8sResource({
      name: 'plain-secret',
      namespace: 'ns',
      data: { key: 'val' },
    });
    expect(isConnectionSecret(secret)).toBe(false);
  });

  it('should return false for secrets with unrelated annotations', () => {
    const secret = mockCustomSecretK8sResource({
      name: 'plain-secret',
      namespace: 'ns',
      data: { key: 'val' },
      annotations: { 'openshift.io/display-name': 'My Secret' },
    });
    expect(isConnectionSecret(secret)).toBe(false);
  });

  it('should return false for secrets with connection-type but not -protocol or -ref', () => {
    const secret = mockCustomSecretK8sResource({
      name: 'legacy-conn',
      namespace: 'ns',
      data: { key: 'val' },
      annotations: { 'opendatahub.io/connection-type': 's3' },
    });
    expect(isConnectionSecret(secret)).toBe(false);
  });

  it('should return false when metadata.annotations is undefined', () => {
    const secret = mockCustomSecretK8sResource({
      name: 'no-annotations',
      namespace: 'ns',
      data: { key: 'val' },
    });
    delete (secret.metadata as Record<string, unknown>).annotations;
    expect(isConnectionSecret(secret)).toBe(false);
  });
});

describe('isDashboardSecret', () => {
  it('should return true for secrets with the dashboard label', () => {
    const secret = mockCustomSecretK8sResource({
      name: 'dashboard-secret',
      namespace: 'ns',
      data: { key: 'val' },
      labels: { [KnownLabels.DASHBOARD_RESOURCE]: 'true' },
    });
    expect(isDashboardSecret(secret)).toBe(true);
  });

  it('should return false for secrets without the dashboard label', () => {
    const secret = mockCustomSecretK8sResource({
      name: 'external-secret',
      namespace: 'ns',
      data: { key: 'val' },
    });
    delete secret.metadata.labels;
    expect(isDashboardSecret(secret)).toBe(false);
  });

  it('should return false when dashboard label is false', () => {
    const secret = mockCustomSecretK8sResource({
      name: 'disabled-secret',
      namespace: 'ns',
      data: { key: 'val' },
    });
    secret.metadata.labels = { [KnownLabels.DASHBOARD_RESOURCE]: 'false' };
    expect(isDashboardSecret(secret)).toBe(false);
  });
});
