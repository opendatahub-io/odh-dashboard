import { mockStorageClasses } from '#~/__mocks__/mockStorageClasses.ts';
import { AccessModeSettings, MetadataAnnotation } from '#~/k8sTypes.ts';
import {
  AccessMode,
  StorageProvisioner,
  provisionerAccessModes,
} from '#~/pages/storageClasses/storageEnums';
import {
  getDefaultAccessModeSettingsForProvisioner,
  getStorageClassConfig,
  getSupportedAccessModesForProvisioner,
  isValidAccessModeSettings,
  setDefaultStorageClass,
} from '#~/pages/storageClasses/utils';

describe('getSupportedAccessModesForProvisioner', () => {
  it('should return correct access modes for a known provisioner', () => {
    const provisioner = StorageProvisioner.AWS_EBS;
    const expectedModes = provisionerAccessModes[provisioner];
    expect(getSupportedAccessModesForProvisioner(provisioner)).toEqual(expectedModes);
  });

  it('should return correct access modes for ODF CephFS provisioner', () => {
    expect(getSupportedAccessModesForProvisioner(StorageProvisioner.CEPHFS_CSI_ODF)).toEqual([
      AccessMode.RWO,
      AccessMode.RWX,
      AccessMode.ROX,
      AccessMode.RWOP,
    ]);
  });

  it('should return correct access modes for ODF RBD provisioner', () => {
    expect(getSupportedAccessModesForProvisioner(StorageProvisioner.RBD_CSI_ODF)).toEqual([
      AccessMode.RWO,
      AccessMode.ROX,
      AccessMode.RWOP,
    ]);
  });

  it('should return null for an unknown provisioner', () => {
    expect(getSupportedAccessModesForProvisioner('unknown-provisioner')).toBeNull();
  });
});

describe('getDefaultAccessModeSettingsForProvisioner', () => {
  it('should enable all supported modes for a known provisioner', () => {
    expect(getDefaultAccessModeSettingsForProvisioner(StorageProvisioner.CEPHFS_CSI_ODF)).toEqual({
      [AccessMode.RWO]: true,
      [AccessMode.RWX]: true,
      [AccessMode.ROX]: true,
      [AccessMode.RWOP]: true,
    });
  });

  it('should default to RWO only for an unknown provisioner', () => {
    expect(getDefaultAccessModeSettingsForProvisioner('unknown-provisioner')).toEqual({
      [AccessMode.RWO]: true,
    });
  });

  it('should default to RWO only when no provisioner is provided', () => {
    expect(getDefaultAccessModeSettingsForProvisioner()).toEqual({
      [AccessMode.RWO]: true,
    });
  });
});

describe('isValidAccessModeSettings', () => {
  it('returns true for valid settings', () => {
    const value: AccessModeSettings = {
      [AccessMode.RWO]: true,
      [AccessMode.RWOP]: false,
    };
    expect(isValidAccessModeSettings(value)).toBe(true);
  });
  it('returns true if a supported mode is missing', () => {
    const value: AccessModeSettings = {
      [AccessMode.RWO]: true,
    };
    expect(isValidAccessModeSettings(value)).toBe(true);
  });

  it('returns false if a mode is not boolean', () => {
    const value = {
      [AccessMode.RWO]: true,
      [AccessMode.RWOP]: 'notBoolean',
    };
    expect(isValidAccessModeSettings(value as unknown as AccessModeSettings)).toBe(false);
  });

  it('returns true if extra unsupported mode is present but is a boolean', () => {
    const value = {
      [AccessMode.RWO]: true,
      [AccessMode.RWOP]: false,
      [AccessMode.RWX]: true,
      randomString: true,
    };
    expect(isValidAccessModeSettings(value)).toBe(true);
  });

  it('returns false if value is not an object', () => {
    expect(isValidAccessModeSettings(undefined)).toBe(false);
    expect(isValidAccessModeSettings(true)).toBe(false);
    expect(isValidAccessModeSettings('')).toBe(false);
    expect(isValidAccessModeSettings('random string')).toBe(false);
  });

  it('returns true if value is an empty object', () => {
    const value = {};
    expect(isValidAccessModeSettings(value)).toBe(true);
  });
});

describe('setDefaultStorageClass', () => {
  const defaultStorageClass = mockStorageClasses[0];
  const nonDefaultStorageClass = mockStorageClasses[1];
  const modifiedNonDefaultStorageClass = {
    ...nonDefaultStorageClass,
    metadata: {
      ...nonDefaultStorageClass.metadata,
      annotations: {
        ...nonDefaultStorageClass.metadata.annotations,
        [MetadataAnnotation.OdhStorageClassConfig]: JSON.stringify({
          ...getStorageClassConfig(nonDefaultStorageClass),
          isDefault: true,
          isEnabled: true,
        }),
      },
    },
  };
  const modifiedDefaultStorageClass = {
    ...defaultStorageClass,
    metadata: {
      ...defaultStorageClass.metadata,
      annotations: {
        ...defaultStorageClass.metadata.annotations,
        [MetadataAnnotation.OdhStorageClassConfig]: JSON.stringify({
          ...getStorageClassConfig(defaultStorageClass),
          isDefault: false,
        }),
      },
    },
  };

  it('should keep only the first default storage class as a default if there are multiple default storage classes', () => {
    const storageClasses = [defaultStorageClass, defaultStorageClass, nonDefaultStorageClass];
    const result = setDefaultStorageClass(storageClasses);
    expect(result).toEqual([
      defaultStorageClass,
      modifiedDefaultStorageClass,
      nonDefaultStorageClass,
    ]);
  });

  it('should return the same storage classes if they have a default storage class', () => {
    const storageClasses = [nonDefaultStorageClass, defaultStorageClass, nonDefaultStorageClass];
    const result = setDefaultStorageClass(storageClasses);
    expect(result).toEqual(storageClasses);
  });

  it('should return the storage classes with the default storage class as the openshift default storage class', () => {
    const storageClasses = [
      nonDefaultStorageClass,
      nonDefaultStorageClass,
      modifiedDefaultStorageClass,
    ];
    const result = setDefaultStorageClass(storageClasses);
    expect(result).toEqual([nonDefaultStorageClass, nonDefaultStorageClass, defaultStorageClass]);
  });

  it('should return the storage classes with the default storage class as the first item if there is no default storage class present and no openshift default storage class present', () => {
    const storageClasses = [nonDefaultStorageClass, nonDefaultStorageClass];
    const result = setDefaultStorageClass(storageClasses);
    expect(result).toEqual([modifiedNonDefaultStorageClass, nonDefaultStorageClass]);
  });
});
