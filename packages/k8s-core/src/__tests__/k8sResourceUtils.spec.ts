import { hasK8sIdentity } from '../k8sResourceUtils';

describe('hasK8sIdentity', () => {
  it('should accept a named Kubernetes resource without requiring a spec or namespace', () => {
    expect(
      hasK8sIdentity({ apiVersion: 'v1', kind: 'ConfigMap', metadata: { name: 'config' } }),
    ).toBe(true);
  });

  it.each([
    undefined,
    null,
    [],
    'resource',
    42,
    {},
    { apiVersion: 1, kind: 'ConfigMap', metadata: { name: 'config' } },
    { apiVersion: 'v1', metadata: { name: 'config' } },
    { apiVersion: 'v1', kind: 42, metadata: { name: 'config' } },
    { apiVersion: 'v1', kind: 'ConfigMap' },
    { apiVersion: 'v1', kind: 'ConfigMap', metadata: null },
    { apiVersion: 'v1', kind: 'ConfigMap', metadata: [] },
    { apiVersion: 'v1', kind: 'ConfigMap', metadata: 'metadata' },
    { apiVersion: 'v1', kind: 'ConfigMap', metadata: {} },
    { apiVersion: 'v1', kind: 'ConfigMap', metadata: { name: 42 } },
  ])('should reject missing or malformed identity fields in %j', (value) => {
    expect(hasK8sIdentity(value)).toBe(false);
  });
});
