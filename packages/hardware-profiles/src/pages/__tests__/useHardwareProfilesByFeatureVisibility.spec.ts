import { mockHardwareProfile } from '../../__mocks__/mockHardwareProfile';
import { filterHardwareProfileByFeatureVisibility } from '../useHardwareProfilesByFeatureVisibility';

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

  it('should keep DRA profiles, including ones without identifiers, when includeDRA is set', () => {
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
      true,
    );

    expect(result.map((profile) => profile.metadata.name)).toEqual([
      'dra-profile',
      'dra-only-profile',
      'regular-profile',
    ]);
  });
});
