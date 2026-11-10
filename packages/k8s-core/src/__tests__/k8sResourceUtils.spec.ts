import { getCreatorFromK8sResource, hasK8sIdentity, isOOTB } from '../k8sResourceUtils';
import { mockConnectionTypeConfigMapObj } from '../__mocks__/mockConnectionType';
import type { K8sResourceCommon } from '../k8sTypes';

describe('isOOTB', () => {
  it('should recognize a pre-installed resource by its part-of label', () => {
    expect(isOOTB(mockConnectionTypeConfigMapObj({ preInstalled: true }))).toBe(true);
  });

  it('should treat any nonempty part-of label as pre-installed', () => {
    const resource: K8sResourceCommon = mockConnectionTypeConfigMapObj({});
    resource.metadata = {
      ...resource.metadata,
      labels: { 'platform.opendatahub.io/part-of': 'false' },
    };
    expect(isOOTB(resource)).toBe(true);
  });

  it.each<Record<string, string> | undefined>([
    undefined,
    {},
    { 'platform.opendatahub.io/part-of': '' },
  ])('should treat missing or empty part-of labels as user-created', (labels) => {
    const resource: K8sResourceCommon = mockConnectionTypeConfigMapObj({});
    resource.metadata = { ...resource.metadata, labels };
    expect(isOOTB(resource)).toBe(false);
  });
});

describe('getCreatorFromK8sResource', () => {
  it('should show the pre-installed label before the username', () => {
    expect(
      getCreatorFromK8sResource(
        mockConnectionTypeConfigMapObj({ preInstalled: true, username: 'installer' }),
      ),
    ).toBe('Pre-installed');
  });

  it('should show the creator of a user-created resource', () => {
    expect(getCreatorFromK8sResource(mockConnectionTypeConfigMapObj({ username: 'alice' }))).toBe(
      'alice',
    );
  });

  it('should fall back to unknown for an empty username', () => {
    expect(getCreatorFromK8sResource(mockConnectionTypeConfigMapObj({ username: '' }))).toBe(
      'unknown',
    );
  });

  it('should fall back to unknown when annotations are missing', () => {
    const resource = mockConnectionTypeConfigMapObj({});
    delete resource.metadata.annotations;
    expect(getCreatorFromK8sResource(resource)).toBe('unknown');
  });
});

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
