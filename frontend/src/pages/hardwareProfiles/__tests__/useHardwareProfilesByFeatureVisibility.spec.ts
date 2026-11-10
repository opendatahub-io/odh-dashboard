import { mockHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { filterHardwareProfileByFeatureVisibility } from '#~/pages/hardwareProfiles/useHardwareProfilesByFeatureVisibility';

describe('filterHardwareProfileByFeatureVisibility', () => {
  it('should exclude DRA profiles by default', () => {
    const draProfile = mockHardwareProfile({
      name: 'dra-profile',
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });
    const draOnlyProfile = mockHardwareProfile({
      name: 'dra-only-profile',
      identifiers: [],
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });
    const regularProfile = mockHardwareProfile({ name: 'regular-profile' });

    const result = filterHardwareProfileByFeatureVisibility([
      draProfile,
      draOnlyProfile,
      regularProfile,
    ]);

    expect(result.map((profile) => profile.metadata.name)).toEqual(['regular-profile']);
  });

  it('should keep only valid DRA profiles when dra is "valid"', () => {
    const draProfile = mockHardwareProfile({
      name: 'dra-profile',
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });
    const draOnlyProfile = mockHardwareProfile({
      name: 'dra-only-profile',
      identifiers: [],
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });
    const regularProfile = mockHardwareProfile({ name: 'regular-profile' });

    const result = filterHardwareProfileByFeatureVisibility(
      [draProfile, draOnlyProfile, regularProfile],
      undefined,
      'valid',
    );

    expect(result.map((profile) => profile.metadata.name)).toEqual([
      'dra-profile',
      'regular-profile',
    ]);
  });

  it('should keep DRA profiles, including ones without identifiers, when dra is "all"', () => {
    const draProfile = mockHardwareProfile({
      name: 'dra-profile',
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });
    const draOnlyProfile = mockHardwareProfile({
      name: 'dra-only-profile',
      identifiers: [],
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });
    const regularProfile = mockHardwareProfile({ name: 'regular-profile' });

    const result = filterHardwareProfileByFeatureVisibility(
      [draProfile, draOnlyProfile, regularProfile],
      undefined,
      'all',
    );

    expect(result.map((profile) => profile.metadata.name)).toEqual([
      'dra-profile',
      'dra-only-profile',
      'regular-profile',
    ]);
  });
});
