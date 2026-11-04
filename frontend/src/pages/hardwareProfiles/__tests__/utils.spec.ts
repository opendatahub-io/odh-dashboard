import { mockHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { IdentifierResourceType } from '@odh-dashboard/k8s-core';
import {
  generateWarningForHardwareProfiles,
  HardwareProfileBannerWarningTitles,
  mergeHardwareProfileOrder,
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

const DISABLED_MESSAGE =
  'You must have at least one hardware profile enabled for users to create workbenches or deploy models. Enable one or more profiles in the table below.';
const DRA_DISABLED_MESSAGE =
  'You must have at least one valid hardware profile enabled for users to create workbenches or deploy models. Hardware profiles that use dynamic resource allocation (DRA) can only be enabled by updating the HardwareProfile resource directly.';

describe('generateWarningForHardwareProfiles', () => {
  describe('when DRA selection is available', () => {
    it('should show the DRA all disabled warning when the only enabled DRA profiles are missing CPU or memory', () => {
      const draProfile = mockHardwareProfile({
        name: 'dra-profile',
        identifiers: [],
        dra: { resourceClaimTemplateName: 'single-gpu' },
      });

      expect(generateWarningForHardwareProfiles([draProfile], true)).toEqual({
        title: HardwareProfileBannerWarningTitles.ALL_DISABLED,
        message: DRA_DISABLED_MESSAGE,
      });
    });

    it('should show the all disabled warning when the only enabled profile is a DRA profile missing CPU or memory', () => {
      const draProfile = mockHardwareProfile({
        name: 'dra-profile',
        identifiers: [],
        dra: { resourceClaimTemplateName: 'single-gpu' },
      });
      const disabledProfile = mockHardwareProfile({
        name: 'disabled-profile',
        annotations: { 'opendatahub.io/disabled': 'true' },
      });

      expect(generateWarningForHardwareProfiles([draProfile, disabledProfile], true)).toEqual({
        title: HardwareProfileBannerWarningTitles.ALL_DISABLED,
        message: DISABLED_MESSAGE,
      });
    });

    it('should show the DRA all disabled warning when the only profiles are disabled DRA profiles', () => {
      const draProfile = mockHardwareProfile({
        name: 'dra-profile',
        annotations: { 'opendatahub.io/disabled': 'true' },
        dra: { resourceClaimTemplateName: 'single-gpu' },
      });

      expect(generateWarningForHardwareProfiles([draProfile], true)).toEqual({
        title: HardwareProfileBannerWarningTitles.ALL_DISABLED,
        message: DRA_DISABLED_MESSAGE,
      });
    });

    it('should not show a warning when the only profiles are enabled valid DRA profiles', () => {
      const draProfile = mockHardwareProfile({
        name: 'dra-profile',
        dra: { resourceClaimTemplateName: 'single-gpu' },
      });

      expect(generateWarningForHardwareProfiles([draProfile], true)).toBeUndefined();
    });

    it('should not show a warning when an enabled valid DRA profile is the only enabled profile', () => {
      const draProfile = mockHardwareProfile({
        name: 'dra-profile',
        dra: { resourceClaimTemplateName: 'single-gpu' },
      });
      const disabledProfile = mockHardwareProfile({
        name: 'disabled-profile',
        annotations: { 'opendatahub.io/disabled': 'true' },
      });

      expect(
        generateWarningForHardwareProfiles([draProfile, disabledProfile], true),
      ).toBeUndefined();
    });

    it('should not show a warning when a regular profile is enabled and the DRA profiles are disabled', () => {
      const draProfile = mockHardwareProfile({
        name: 'dra-profile',
        annotations: { 'opendatahub.io/disabled': 'true' },
        dra: { resourceClaimTemplateName: 'single-gpu' },
      });
      const enabledProfile = mockHardwareProfile({ name: 'enabled-profile' });

      expect(
        generateWarningForHardwareProfiles([draProfile, enabledProfile], true),
      ).toBeUndefined();
    });

    it('should not show the all invalid warning when an enabled valid DRA profile exists', () => {
      const draProfile = mockHardwareProfile({
        name: 'dra-profile',
        dra: { resourceClaimTemplateName: 'single-gpu' },
      });
      const invalidProfile = mockHardwareProfile({
        name: 'invalid-profile',
        identifiers: [
          {
            displayName: 'CPU',
            identifier: 'cpu',
            minCount: '4',
            maxCount: '2',
            defaultCount: '1',
            resourceType: IdentifierResourceType.CPU,
          },
        ],
      });

      expect(generateWarningForHardwareProfiles([draProfile, invalidProfile], true)).toEqual({
        title: HardwareProfileBannerWarningTitles.SOME_INVALID,
        message:
          'One or more of your defined hardware profiles are invalid. Take the appropriate actions below to revalidate your profiles.',
      });
    });

    it('should not show the all incomplete warning when an enabled valid DRA profile exists', () => {
      const draProfile = mockHardwareProfile({
        name: 'dra-profile',
        dra: { resourceClaimTemplateName: 'single-gpu' },
      });
      const incompleteProfile = mockHardwareProfile({
        name: 'incomplete-profile',
        identifiers: [],
      });

      expect(generateWarningForHardwareProfiles([draProfile, incompleteProfile], true)).toEqual({
        title: HardwareProfileBannerWarningTitles.SOME_INCOMPLETE,
        message:
          'One or more of your defined hardware profiles are missing either CPU or Memory. This is not recommended.',
      });
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

      expect(generateWarningForHardwareProfiles([draProfile, disabledProfile], true)).toEqual({
        title: HardwareProfileBannerWarningTitles.ALL_DISABLED,
        message: DISABLED_MESSAGE,
      });
    });
  });

  describe('when DRA selection is not available', () => {
    it('should not show a warning when the only profiles are DRA profiles', () => {
      const enabledDRAProfile = mockHardwareProfile({
        name: 'enabled-dra-profile',
        dra: { resourceClaimTemplateName: 'single-gpu' },
      });
      const disabledDRAProfile = mockHardwareProfile({
        name: 'disabled-dra-profile',
        annotations: { 'opendatahub.io/disabled': 'true' },
        dra: { resourceClaimTemplateName: 'single-gpu' },
      });

      expect(
        generateWarningForHardwareProfiles([enabledDRAProfile, disabledDRAProfile], false),
      ).toBeUndefined();
    });

    it('should show the all disabled warning when the only enabled profile is a valid DRA profile', () => {
      const draProfile = mockHardwareProfile({
        name: 'dra-profile',
        dra: { resourceClaimTemplateName: 'single-gpu' },
      });
      const disabledProfile = mockHardwareProfile({
        name: 'disabled-profile',
        annotations: { 'opendatahub.io/disabled': 'true' },
      });

      expect(generateWarningForHardwareProfiles([draProfile, disabledProfile], false)).toEqual({
        title: HardwareProfileBannerWarningTitles.ALL_DISABLED,
        message: DISABLED_MESSAGE,
      });
    });

    it('should not show a warning when a regular profile is enabled', () => {
      const draProfile = mockHardwareProfile({
        name: 'dra-profile',
        annotations: { 'opendatahub.io/disabled': 'true' },
        dra: { resourceClaimTemplateName: 'single-gpu' },
      });
      const enabledProfile = mockHardwareProfile({ name: 'enabled-profile' });

      expect(
        generateWarningForHardwareProfiles([draProfile, enabledProfile], false),
      ).toBeUndefined();
    });
  });
});

describe('mergeHardwareProfileOrder', () => {
  it('should keep hidden profiles at their positions when the visible profiles are reordered', () => {
    expect(
      mergeHardwareProfileOrder(['dra-a', 'small', 'large'], ['large', 'small'], ['dra-a']),
    ).toEqual(['dra-a', 'large', 'small']);
  });

  it('should keep hidden profiles between visible ones', () => {
    expect(
      mergeHardwareProfileOrder(
        ['small', 'dra-a', 'large', 'dra-b', 'medium'],
        ['medium', 'large', 'small'],
        ['dra-a', 'dra-b'],
      ),
    ).toEqual(['medium', 'dra-a', 'large', 'dra-b', 'small']);
  });

  it('should append visible profiles that are not in the current order', () => {
    expect(mergeHardwareProfileOrder(['dra-a', 'small'], ['large', 'small'], ['dra-a'])).toEqual([
      'dra-a',
      'large',
      'small',
    ]);
  });

  it('should return the visible order when no profile is hidden', () => {
    expect(mergeHardwareProfileOrder(['small', 'large'], ['large', 'small'], [])).toEqual([
      'large',
      'small',
    ]);
  });

  it('should return the visible order when there is no current order', () => {
    expect(mergeHardwareProfileOrder([], ['large', 'small'], ['dra-a'])).toEqual([
      'large',
      'small',
    ]);
  });

  it('should drop names of profiles that no longer exist', () => {
    expect(
      mergeHardwareProfileOrder(
        ['deleted', 'dra-a', 'small', 'large'],
        ['large', 'small'],
        ['dra-a'],
      ),
    ).toEqual(['dra-a', 'large', 'small']);
  });
});
