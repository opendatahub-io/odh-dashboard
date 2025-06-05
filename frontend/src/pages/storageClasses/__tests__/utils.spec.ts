import {
  AccessMode,
  StorageProvisioner,
  provisionerAccessModes,
} from '#~/pages/storageClasses/storageEnums';
import {
  getSupportedAccessModesForProvisioner,
  getDefaultAccessModeSettings,
  isValidAccessModeSettings,
} from '#~/pages/storageClasses/utils';

const mockStorageClass = (provisioner: StorageProvisioner | string) => ({
  apiVersion: 'storage.k8s.io/v1',
  kind: 'StorageClass',
  metadata: { name: 'test', annotations: {} },
  provisioner,
  reclaimPolicy: 'Delete',
  volumeBindingMode: 'Immediate',
  allowVolumeExpansion: true,
});

describe('getSupportedAccessModesForProvisioner', () => {
  it('should return correct access modes for a known provisioner', () => {
    const provisioner = StorageProvisioner.AWS_EBS;
    const expectedModes = provisionerAccessModes[provisioner];
    expect(getSupportedAccessModesForProvisioner(provisioner)).toEqual(expectedModes);
  });
});

describe('getDefaultAccessModeSettings', () => {
  it('should set RWO to true and other supported modes to false', () => {
    const supportedModes = [AccessMode.RWO, AccessMode.RWX, AccessMode.ROX, AccessMode.RWOP];
    const expectedSettings = {
      [AccessMode.RWO]: true,
      [AccessMode.RWX]: false,
      [AccessMode.ROX]: false,
      [AccessMode.RWOP]: false,
    };
    expect(getDefaultAccessModeSettings(supportedModes)).toEqual(expectedSettings);
  });

  it('should handle a mix of modes correctly', () => {
    const supportedModes = [AccessMode.RWO, AccessMode.ROX];
    const expectedSettings = {
      [AccessMode.RWO]: true,
      [AccessMode.ROX]: false,
    };
    expect(getDefaultAccessModeSettings(supportedModes)).toEqual(expectedSettings);
  });
});

describe('isValidAccessModeSettings', () => {
  it('returns true for valid settings (all supported, correct types, RWO true)', () => {
    const sc = mockStorageClass(StorageProvisioner.AWS_EBS);
    const value: Partial<Record<AccessMode, boolean>> = {
      [AccessMode.RWO]: true,
      [AccessMode.RWOP]: false,
    };
    expect(isValidAccessModeSettings(sc, value)).toBe(true);
  });
  it('returns false if a supported mode is missing', () => {
    const sc = mockStorageClass(StorageProvisioner.AWS_EBS);
    const value: Partial<Record<AccessMode, boolean>> = {
      [AccessMode.RWO]: true,
      // RWOP missing
    };
    expect(isValidAccessModeSettings(sc, value)).toBe(false);
  });

  it('returns false if a mode is not boolean', () => {
    const sc = mockStorageClass(StorageProvisioner.AWS_EBS);
    const value: Partial<Record<AccessMode, boolean | string>> = {
      [AccessMode.RWO]: true,
      [AccessMode.RWOP]: 'notBoolean',
    };
    expect(isValidAccessModeSettings(sc, value)).toBe(false);
  });

  it('returns false if extra unsupported mode is present', () => {
    const sc = mockStorageClass(StorageProvisioner.AWS_EBS);
    const value: Partial<Record<AccessMode, boolean>> = {
      [AccessMode.RWO]: true,
      [AccessMode.RWOP]: false,
      [AccessMode.RWX]: true,
    };
    expect(isValidAccessModeSettings(sc, value)).toBe(false);
  });

  it('returns false if value is not an object', () => {
    const sc = mockStorageClass(StorageProvisioner.AWS_EBS);
    expect(isValidAccessModeSettings(sc, undefined)).toBe(false);
    expect(isValidAccessModeSettings(sc, true)).toBe(false);
    expect(isValidAccessModeSettings(sc, '')).toBe(false);
    expect(isValidAccessModeSettings(sc, 'random string')).toBe(false);
  });

  it('returns false if value is an empty object', () => {
    const sc = mockStorageClass(StorageProvisioner.AWS_EBS);
    const value = {};
    expect(isValidAccessModeSettings(sc, value)).toBe(false);
  });

  it('returns true for provisioner not in enum (should only require RWO)', () => {
    const sc = mockStorageClass('custom-provisioner');
    const value = { [AccessMode.RWO]: true };
    expect(isValidAccessModeSettings(sc, value as Partial<Record<AccessMode, boolean>>)).toBe(true);
  });
});
