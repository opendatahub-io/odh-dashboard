import { mockPVCK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPVCK8sResource';
import type { StorageData } from '#~/pages/projects/types';
import { isPvcUpdateRequired } from '#~/pages/projects/screens/detail/storage/utils';

// Baseline StorageData that matches mockPVCK8sResource's defaults so only the
// field under test differs from the existing PVC.
const baseStorageData: StorageData = {
  name: 'Test Storage',
  description: '',
  size: '5Gi',
  storageClassName: 'gp3',
};

describe('isPvcUpdateRequired', () => {
  it('should return false when nothing changed', () => {
    expect(isPvcUpdateRequired(mockPVCK8sResource({}), baseStorageData)).toBe(false);
  });

  it('should return true when an additional annotation is added', () => {
    expect(
      isPvcUpdateRequired(mockPVCK8sResource({}), {
        ...baseStorageData,
        contextTypeAnnotations: { 'dashboard.opendatahub.io/nim-subpath': 'models/foo' },
      }),
    ).toBe(true);
  });

  it('should return true when an existing additional annotation value changes', () => {
    const existingPvc = mockPVCK8sResource({
      annotations: { 'dashboard.opendatahub.io/nim-subpath': 'models/foo' },
    });
    expect(
      isPvcUpdateRequired(existingPvc, {
        ...baseStorageData,
        contextTypeAnnotations: { 'dashboard.opendatahub.io/nim-subpath': 'models/bar' },
      }),
    ).toBe(true);
  });

  it('should return true when an additional annotation is removed', () => {
    const existingPvc = mockPVCK8sResource({
      annotations: { 'dashboard.opendatahub.io/nim-subpath': 'models/foo' },
    });
    expect(
      isPvcUpdateRequired(existingPvc, {
        ...baseStorageData,
        contextTypeAnnotations: { 'dashboard.opendatahub.io/nim-subpath': '' },
      }),
    ).toBe(true);
  });

  it('should return false when the additional annotation matches the existing value', () => {
    const existingPvc = mockPVCK8sResource({
      annotations: { 'dashboard.opendatahub.io/nim-subpath': 'models/foo' },
    });
    expect(
      isPvcUpdateRequired(existingPvc, {
        ...baseStorageData,
        contextTypeAnnotations: { 'dashboard.opendatahub.io/nim-subpath': 'models/foo' },
      }),
    ).toBe(false);
  });
});
