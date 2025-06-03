import { renderHook } from '@testing-library/react';
import {
  useCreateStorageObject,
  useMountPathFormat,
  validateMountPath,
} from '#~/pages/projects/screens/spawner/storage/utils';
import { MountPathFormat } from '#~/pages/projects/screens/spawner/storage/types';
import { MOUNT_PATH_PREFIX } from '#~/pages/projects/screens/spawner/storage/const';
import { PersistentVolumeClaimKind, MetadataAnnotation } from '#~/k8sTypes';
import { AccessMode } from '#~/pages/storageClasses/storageEnums';
import { getPossibleStorageClassAccessModes } from '#~/pages/storageClasses/utils';
import { mockStorageClasses } from '#~/__mocks__/mockStorageClasses';

jest.mock('#~/pages/projects/screens/spawner/storage/useDefaultPvcSize.ts', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue('1Gi'), // Set the default PVC size to 1Gi
}));

jest.mock('#~/concepts/k8s/utils', () => ({
  getDisplayNameFromK8sResource: jest.fn(
    (data) => data?.metadata.annotations?.['openshift.io/display-name'] || '',
  ),
  getDescriptionFromK8sResource: jest.fn(
    (data) => data?.metadata.annotations?.['openshift.io/description'] || '',
  ),
}));

describe('useCreateStorageObject', () => {
  const existingData: PersistentVolumeClaimKind = {
    apiVersion: 'v1',
    kind: 'PersistentVolumeClaim',
    metadata: {
      annotations: {
        'openshift.io/description': 'Test PVC Description',
        'openshift.io/display-name': 'test-pvc',
      },
      labels: { 'opendatahub.io/dashboard': 'true' },
      name: 'test-pvc',
      namespace: 'namespace',
    },
    spec: {
      accessModes: [AccessMode.RWO],
      resources: { requests: { storage: '2Gi' } },
      volumeMode: 'Filesystem',
      storageClassName: 'test-storage-class',
    },
    status: { phase: 'Pending' },
  };
  it('should initialize with default values when no existingData is provided', () => {
    const { result } = renderHook(() => useCreateStorageObject());

    const [data] = result.current;
    expect(data).toEqual({
      name: '',
      k8sName: '',
      description: '',
      size: '1Gi',
      storageClassName: undefined,
    });
  });

  it('should initialize with existingData when provided', () => {
    const { result } = renderHook(() => useCreateStorageObject(existingData));

    const [data] = result.current;
    expect(data.name).toBe('test-pvc');
    expect(data.description).toBe('Test PVC Description');
    expect(data.size).toBe('2Gi');
    expect(data.storageClassName).toBe('test-storage-class');
  });
});

describe('validateMountPath', () => {
  const inUseMountPaths = ['/existing-folder', '/another-folder'];

  it('should return error message for empty value in CUSTOM format', () => {
    const result = validateMountPath('', inUseMountPaths);
    expect(result).toBe(
      'Enter a path to a model or folder. This path cannot point to a root folder.',
    );
  });

  it('should return an error for empty value in STANDARD format', () => {
    const result = validateMountPath('', inUseMountPaths);
    expect(result).toBe(
      'Enter a path to a model or folder. This path cannot point to a root folder.',
    );
  });

  it('should return error message for invalid characters in the path', () => {
    const result = validateMountPath('Invalid/Path', inUseMountPaths);
    expect(result).toBe('Must only consist of lowercase letters, dashes, numbers and slashes.');
  });

  it('should return error message for already in-use mount path', () => {
    const result = validateMountPath('/existing-folder', inUseMountPaths);
    expect(result).toBe('Mount path is already in use for this workbench.');
  });

  it('should return an empty string for valid and unused mount path', () => {
    const result = validateMountPath('new-folder', inUseMountPaths);
    expect(result).toBe('');
  });

  it('should allow valid folder name with a trailing slash', () => {
    const result = validateMountPath('valid-folder/', inUseMountPaths);
    expect(result).toBe('');
  });

  it('should return error for an invalid folder name with numbers or uppercase letters', () => {
    const result = validateMountPath('Invalid123', inUseMountPaths);
    expect(result).toBe('Must only consist of lowercase letters, dashes, numbers and slashes.');
  });

  it('should return an empty string for valid mount path in CUSTOM format', () => {
    const result = validateMountPath('custom-folder', inUseMountPaths);
    expect(result).toBe('');
  });

  it('should return error for an invalid folder name with uppercase letters in CUSTOM format', () => {
    const result = validateMountPath('InvalidFolder', inUseMountPaths);
    expect(result).toBe('Must only consist of lowercase letters, dashes, numbers and slashes.');
  });
});

describe('useMountPathFormat', () => {
  it('return MountPathFormat.STANDARD if mountPath starts with /opt/app-root/src/', () => {
    const { result } = renderHook(() =>
      useMountPathFormat(false, `${MOUNT_PATH_PREFIX}/some-path`),
    );

    const [format] = result.current;
    expect(format).toBe(MountPathFormat.STANDARD);
  });

  it('return MountPathFormat.CUSTOM if mountPath does not start with /opt/app-root/src/', () => {
    const { result } = renderHook(() => useMountPathFormat(false, '/custom-path'));

    const [format] = result.current;
    expect(format).toBe(MountPathFormat.CUSTOM);
  });

  it('should update format based on the mountPath change', () => {
    const { result, rerender } = renderHook(
      ({ isCreate, mountPath }) => useMountPathFormat(isCreate, mountPath),
      {
        initialProps: { isCreate: false, mountPath: '/custom-path' },
      },
    );

    // Initial format
    expect(result.current[0]).toBe(MountPathFormat.CUSTOM);

    // Change the mountPath to a path with MOUNT_PATH_PREFIX
    rerender({ isCreate: false, mountPath: `${MOUNT_PATH_PREFIX}/new-path` });

    // Format should update to STANDARD
    expect(result.current[0]).toBe(MountPathFormat.STANDARD);
  });
});

describe('getPossibleStorageClassAccessModes', () => {
  it('returns empty arrays if no storageClass is provided', () => {
    const result = getPossibleStorageClassAccessModes();
    expect(result.openshiftSupportedAccessModes).toEqual([]);
    expect(result.adminSupportedAccessModes).toEqual([]);
    expect(result.selectedStorageClassConfig).toBeUndefined();
  });

  it('returns correct adminSupportedAccessModes from config', () => {
    const storageClass = mockStorageClasses[1];
    const result = getPossibleStorageClassAccessModes(storageClass);
    expect(result.openshiftSupportedAccessModes).toEqual([
      AccessMode.RWO,
      AccessMode.RWX,
      AccessMode.ROX,
      AccessMode.RWOP,
    ]);
    expect(result.adminSupportedAccessModes).toEqual([AccessMode.RWO, AccessMode.RWX]);
  });

  it('filters out RWO if excludeRWO is true', () => {
    const storageClass = mockStorageClasses[1];
    const result = getPossibleStorageClassAccessModes(storageClass, { excludeRWO: true });
    expect(result.adminSupportedAccessModes).toEqual([AccessMode.RWX]);
  });

  it('returns empty adminSupportedAccessModes if config accessModeSettings is empty', () => {
    const storageClass = {
      ...mockStorageClasses[0],
      metadata: {
        ...mockStorageClasses[0].metadata,
        annotations: {
          [MetadataAnnotation.OdhStorageClassConfig]: JSON.stringify({ accessModeSettings: {} }),
        },
      },
    };
    const result = getPossibleStorageClassAccessModes(storageClass);
    expect(result.adminSupportedAccessModes).toEqual([]);
  });
});
