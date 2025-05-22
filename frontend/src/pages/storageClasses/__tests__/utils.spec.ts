import {
  AccessMode,
  StorageProvisioner,
  provisionerAccessModes,
} from '~/pages/storageClasses/storageEnums';
import {
  getSupportedAccessModesForProvisioner,
  getDefaultAccessModeSettings,
} from '~/pages/storageClasses/utils';

describe('getSupportedAccessModesForProvisioner', () => {
  it('should return correct access modes for a known provisioner', () => {
    const provisioner = StorageProvisioner.AWS_EBS;
    const expectedModes = provisionerAccessModes[provisioner];
    expect(getSupportedAccessModesForProvisioner(provisioner)).toEqual(expectedModes);
  });
});

describe('getDefaultAccessModeSettings', () => {
  it('should set ROX to false and other supported modes to true', () => {
    const supportedModes = [AccessMode.RWO, AccessMode.RWX, AccessMode.ROX, AccessMode.RWOP];
    const expectedSettings = {
      [AccessMode.RWO]: true,
      [AccessMode.RWX]: true,
      [AccessMode.ROX]: false,
      [AccessMode.RWOP]: true,
    };
    expect(getDefaultAccessModeSettings(supportedModes)).toEqual(expectedSettings);
  });

  it('should set all supported modes to true if ROX is not present', () => {
    const supportedModes = [AccessMode.RWO, AccessMode.RWX, AccessMode.RWOP];
    const expectedSettings = {
      [AccessMode.RWO]: true,
      [AccessMode.RWX]: true,
      [AccessMode.RWOP]: true,
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
