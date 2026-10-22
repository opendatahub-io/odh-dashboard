import { renderHook, waitFor } from '@testing-library/react';
import { MetadataAnnotation } from '@odh-dashboard/k8s-core';
import { useDefaultStorageClass } from '#~/pages/projects/screens/spawner/storage/useDefaultStorageClass';
import { StorageClassKind } from '#~/k8sTypes';

const mockUseIsAreaAvailable = jest.fn();
jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  useIsAreaAvailable: (...args: unknown[]) => mockUseIsAreaAvailable(...args),
  SupportedArea: { STORAGE_CLASSES: 'STORAGE_CLASSES' },
}));

const mockUseStorageClasses = jest.fn();
jest.mock('#~/concepts/k8s/useStorageClasses', () => ({
  __esModule: true,
  default: () => mockUseStorageClasses(),
}));

let mockAppContextValue: {
  dashboardConfig: { spec: { notebookController?: { storageClassName?: string } } };
  storageClasses: StorageClassKind[];
};

jest.mock('#~/app/AppContext', () => {
  const actualReact = jest.requireActual('react');
  const context = actualReact.createContext(null);
  return {
    __esModule: true,
    AppContext: context,
  };
});

jest.mock('react', () => {
  const actualReact = jest.requireActual('react');
  return {
    ...actualReact,
    useContext: () => mockAppContextValue,
  };
});

const createMockStorageClass = (
  name: string,
  overrides?: {
    isDefault?: boolean;
    isEnabled?: boolean;
    isOpenshiftDefault?: boolean;
  },
): StorageClassKind => {
  const annotations: Record<string, string> = {};

  if (overrides?.isDefault !== undefined || overrides?.isEnabled !== undefined) {
    annotations[MetadataAnnotation.OdhStorageClassConfig] = JSON.stringify({
      displayName: name,
      isDefault: overrides.isDefault ?? false,
      isEnabled: overrides.isEnabled ?? true,
      lastModified: '2024-01-01T00:00:00Z',
    });
  }

  if (overrides?.isOpenshiftDefault) {
    annotations[MetadataAnnotation.StorageClassIsDefault] = 'true';
  }

  return {
    metadata: { name, annotations },
    provisioner: 'test-provisioner',
    reclaimPolicy: 'Delete',
    volumeBindingMode: 'Immediate',
    allowVolumeExpansion: true,
    apiVersion: 'storage.k8s.io/v1',
    kind: 'StorageClass',
  };
};

describe('useDefaultStorageClass', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsAreaAvailable.mockReturnValue({ status: true });
    mockUseStorageClasses.mockReturnValue([[], true, undefined]);
    mockAppContextValue = {
      dashboardConfig: { spec: {} },
      storageClasses: [],
    };
  });

  it('should return loaded=false on first render when admin default is still loading', () => {
    mockUseStorageClasses.mockReturnValue([[], false, undefined]);

    const { result } = renderHook(() => useDefaultStorageClass());
    const [storageClass, loaded] = result.current;

    expect(loaded).toBe(false);
    expect(storageClass).toBeNull();
  });

  it('should not fall through to OpenShift default while admin default is loading', () => {
    const openshiftDefault = createMockStorageClass('gp3-csi', { isOpenshiftDefault: true });

    mockUseStorageClasses.mockReturnValue([[], false, undefined]);
    mockAppContextValue = {
      dashboardConfig: { spec: {} },
      storageClasses: [openshiftDefault],
    };

    const { result } = renderHook(() => useDefaultStorageClass());
    const [storageClass, loaded] = result.current;

    // Should NOT return gp3-csi; should wait for admin default to load first
    expect(loaded).toBe(false);
    expect(storageClass).toBeNull();
  });

  it('should return admin default over OpenShift default once loaded', async () => {
    const adminDefault = createMockStorageClass('admin-sc', {
      isDefault: true,
      isEnabled: true,
    });
    const openshiftDefault = createMockStorageClass('gp3-csi', { isOpenshiftDefault: true });

    mockUseStorageClasses.mockReturnValue([[adminDefault, openshiftDefault], true, undefined]);
    mockAppContextValue = {
      dashboardConfig: { spec: {} },
      storageClasses: [adminDefault, openshiftDefault],
    };

    const { result } = renderHook(() => useDefaultStorageClass());

    // Wait for useFetchState to resolve (async useEffect cycle)
    await waitFor(() => {
      const [, loaded] = result.current;
      expect(loaded).toBe(true);
    });

    const [storageClass] = result.current;
    expect(storageClass?.metadata.name).toBe('admin-sc');
  });

  it('should fall through to OpenShift default when no admin default is configured', async () => {
    const openshiftDefault = createMockStorageClass('gp3-csi', { isOpenshiftDefault: true });
    const otherSc = createMockStorageClass('other-sc', { isEnabled: true });

    mockUseStorageClasses.mockReturnValue([[otherSc, openshiftDefault], true, undefined]);
    mockAppContextValue = {
      dashboardConfig: { spec: {} },
      storageClasses: [otherSc, openshiftDefault],
    };

    const { result } = renderHook(() => useDefaultStorageClass());

    await waitFor(() => {
      const [, loaded] = result.current;
      expect(loaded).toBe(true);
    });

    const [storageClass] = result.current;
    expect(storageClass?.metadata.name).toBe('gp3-csi');
  });

  it('should return null with loaded=true when storage classes area is not available', async () => {
    mockUseIsAreaAvailable.mockReturnValue({ status: false });
    mockUseStorageClasses.mockReturnValue([[], true, undefined]);

    const { result } = renderHook(() => useDefaultStorageClass());

    await waitFor(() => {
      const [, loaded] = result.current;
      expect(loaded).toBe(true);
    });

    const [storageClass] = result.current;
    expect(storageClass).toBeNull();
  });

  it('should fall through to OpenShift default when storage class fetch fails', async () => {
    const openshiftDefault = createMockStorageClass('gp3-csi', { isOpenshiftDefault: true });

    mockUseStorageClasses.mockReturnValue([[], false, new Error('API error')]);
    mockAppContextValue = {
      dashboardConfig: { spec: {} },
      storageClasses: [openshiftDefault],
    };

    const { result } = renderHook(() => useDefaultStorageClass());

    await waitFor(() => {
      const [, loaded] = result.current;
      expect(loaded).toBe(true);
    });

    const [storageClass] = result.current;
    expect(storageClass?.metadata.name).toBe('gp3-csi');
  });

  it('should fall through to preferred storage class when storage class fetch fails', async () => {
    mockUseStorageClasses.mockReturnValue([[], false, new Error('API error')]);
    mockAppContextValue = {
      dashboardConfig: { spec: { notebookController: { storageClassName: 'preferred-sc' } } },
      storageClasses: [createMockStorageClass('preferred-sc')],
    };

    const { result } = renderHook(() => useDefaultStorageClass());

    await waitFor(() => {
      const [, loaded] = result.current;
      expect(loaded).toBe(true);
    });

    const [storageClass] = result.current;
    expect(storageClass?.metadata.name).toBe('preferred-sc');
  });
});
