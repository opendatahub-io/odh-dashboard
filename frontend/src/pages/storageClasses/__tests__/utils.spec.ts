import { AccessModeSettings } from '#~/k8sTypes.ts';
import {
  AccessMode,
  StorageProvisioner,
  provisionerAccessModes,
} from '#~/pages/storageClasses/storageEnums';
import {
  getSupportedAccessModesForProvisioner,
  isValidAccessModeSettings,
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
