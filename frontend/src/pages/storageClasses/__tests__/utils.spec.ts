import {
  AccessMode,
  StorageProvisioner,
  provisionerAccessModes,
} from '#~/pages/storageClasses/storageEnums';
import {
  getSupportedAccessModesForProvisioner,
  getDefaultAccessModeSettings,
} from '#~/pages/storageClasses/utils';

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
