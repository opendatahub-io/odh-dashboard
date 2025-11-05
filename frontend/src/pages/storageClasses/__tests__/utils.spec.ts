import { mockStorageClasses } from '#~/__mocks__/mockStorageClasses.ts';
import { AccessModeSettings, MetadataAnnotation } from '#~/k8sTypes.ts';
import {
  AccessMode,
  StorageProvisioner,
  provisionerAccessModes,
} from '#~/pages/storageClasses/storageEnums';
import {
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

  it('should return the storage classes with the default storage class as the first item if there is no default storage class present', () => {
    const storageClasses = [nonDefaultStorageClass, nonDefaultStorageClass];
    const result = setDefaultStorageClass(storageClasses);
    expect(result).toEqual([modifiedNonDefaultStorageClass, nonDefaultStorageClass]);
  });
});
