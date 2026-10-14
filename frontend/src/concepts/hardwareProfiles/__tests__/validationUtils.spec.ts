import { mockHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { isHardwareProfileConfigValid } from '#~/concepts/hardwareProfiles/validationUtils';

describe('isHardwareProfileConfigValid', () => {
  it('should not validate resources against the limits of a DRA hardware profile', () => {
    const identifiers = [
      {
        identifier: 'cpu',
        displayName: 'CPU',
        minCount: '1',
        maxCount: '2',
        defaultCount: '1',
      },
    ];
    const resources = {
      requests: { cpu: '8' },
      limits: { cpu: '8' },
    };
    const regularProfile = mockHardwareProfile({ name: 'regular-profile', identifiers });
    const draProfile = mockHardwareProfile({
      name: 'dra-profile',
      identifiers,
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });

    expect(
      isHardwareProfileConfigValid({
        selectedProfile: regularProfile,
        useExistingSettings: false,
        resources,
      }),
    ).toBe(false);
    expect(
      isHardwareProfileConfigValid({
        selectedProfile: draProfile,
        useExistingSettings: true,
        resources,
      }),
    ).toBe(true);
  });
});
