import { mockHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import {
  generateWarningForHardwareProfiles,
  HardwareProfileBannerWarningTitles,
  validateProfileWarning,
} from '#~/pages/hardwareProfiles/utils';

describe('validateProfileWarning', () => {
  it('should tell the user to edit the profile for a regular profile', () => {
    const [warning] = validateProfileWarning(mockHardwareProfile({ identifiers: [] }));

    expect(warning.message).toBe(
      'Omitting CPU or Memory resources is not recommended. Edit the profile to make the profile valid.',
    );
  });

  it('should point to the HardwareProfile resource for a DRA profile', () => {
    const [warning] = validateProfileWarning(
      mockHardwareProfile({
        identifiers: [],
        dra: { resourceClaimTemplateName: 'single-gpu' },
      }),
    );

    expect(warning.message).toBe(
      'Omitting CPU or Memory resources is not recommended. Update the HardwareProfile resource directly to make it valid.',
    );
  });
});

describe('generateWarningForHardwareProfiles', () => {
  it('should not show a warning when the only profiles are enabled DRA profiles', () => {
    const draProfile = mockHardwareProfile({
      name: 'dra-profile',
      identifiers: [],
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });

    expect(generateWarningForHardwareProfiles([draProfile])).toBeUndefined();
  });

  it('should show the all disabled warning when the only profiles are disabled DRA profiles', () => {
    const draProfile = mockHardwareProfile({
      name: 'dra-profile',
      annotations: { 'opendatahub.io/disabled': 'true' },
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });

    expect(generateWarningForHardwareProfiles([draProfile])?.title).toBe(
      HardwareProfileBannerWarningTitles.ALL_DISABLED,
    );
  });

  it('should not show a warning when an enabled DRA profile is the only enabled profile', () => {
    const draProfile = mockHardwareProfile({
      name: 'dra-profile',
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });
    const disabledProfile = mockHardwareProfile({
      name: 'disabled-profile',
      annotations: { 'opendatahub.io/disabled': 'true' },
    });

    expect(generateWarningForHardwareProfiles([draProfile, disabledProfile])).toBeUndefined();
  });

  it('should show the all disabled warning when DRA profiles are disabled too', () => {
    const draProfile = mockHardwareProfile({
      name: 'dra-profile',
      annotations: { 'opendatahub.io/disabled': 'true' },
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });
    const disabledProfile = mockHardwareProfile({
      name: 'disabled-profile',
      annotations: { 'opendatahub.io/disabled': 'true' },
    });

    expect(generateWarningForHardwareProfiles([draProfile, disabledProfile])?.title).toBe(
      HardwareProfileBannerWarningTitles.ALL_DISABLED,
    );
  });
});
