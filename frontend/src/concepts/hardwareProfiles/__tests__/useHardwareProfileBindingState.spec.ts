import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import * as useHardwareProfilesModule from '@odh-dashboard/hardware-profiles/pages/useHardwareProfilesByFeatureVisibility';
import { mockNotebookK8sResource } from '#~/__mocks__';
import { useHardwareProfileBindingState } from '#~/concepts/hardwareProfiles/useHardwareProfileBindingState';

jest.mock('@odh-dashboard/hardware-profiles/pages/useHardwareProfilesByFeatureVisibility', () => ({
  ...jest.requireActual(
    '@odh-dashboard/hardware-profiles/pages/useHardwareProfilesByFeatureVisibility',
  ),
  useHardwareProfilesByFeatureVisibility: jest.fn(),
}));

const mockUseHardwareProfiles = jest.mocked(
  useHardwareProfilesModule.useHardwareProfilesByFeatureVisibility,
);

describe('useHardwareProfileBindingState', () => {
  it('should resolve a workload assigned a DRA hardware profile without identifiers', () => {
    const draOnlyProfile = mockHardwareProfile({
      name: 'dra-only-profile',
      namespace: 'opendatahub',
      identifiers: [],
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });
    mockUseHardwareProfiles.mockImplementation((visibility, namespace, options) => ({
      globalProfiles: [
        useHardwareProfilesModule.filterHardwareProfileByFeatureVisibility(
          [draOnlyProfile],
          visibility,
          options?.dra,
        ),
        true,
        undefined,
      ],
      projectProfiles: [[], true, undefined],
    }));
    const notebook = mockNotebookK8sResource({
      hardwareProfileName: 'dra-only-profile',
      hardwareProfileNamespace: 'opendatahub',
    });

    const renderResult = testHook(useHardwareProfileBindingState)(notebook);

    expect(renderResult.result.current).toEqual([
      { state: undefined, profile: draOnlyProfile },
      true,
      undefined,
    ]);
  });

  describe('when only the hardware profile name annotation is set', () => {
    const globalProfile = mockHardwareProfile({ name: 'small', namespace: 'opendatahub' });
    const projectProfile = mockHardwareProfile({
      name: 'small',
      namespace: 'test-project',
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });
    const nameOnlyNotebook = () => mockNotebookK8sResource({ hardwareProfileName: 'small' });

    it('should resolve the profile in the workload namespace when the name exists in both', () => {
      mockUseHardwareProfiles.mockReturnValue({
        globalProfiles: [[globalProfile], true, undefined],
        projectProfiles: [[projectProfile], true, undefined],
      });

      const renderResult = testHook(useHardwareProfileBindingState)(nameOnlyNotebook());

      expect(mockUseHardwareProfiles).toHaveBeenLastCalledWith(undefined, 'test-project', {
        dra: 'all',
      });
      expect(renderResult.result.current[0]?.profile).toBe(projectProfile);
    });

    it('should not fall back to a global profile with the same name', () => {
      mockUseHardwareProfiles.mockReturnValue({
        globalProfiles: [[globalProfile], true, undefined],
        projectProfiles: [[], true, undefined],
      });

      const renderResult = testHook(useHardwareProfileBindingState)(nameOnlyNotebook());

      expect(renderResult.result.current[0]?.profile).toBeUndefined();
    });
  });

  it('should not look up project profiles for a workload without hardware profile annotations', () => {
    mockUseHardwareProfiles.mockReturnValue({
      globalProfiles: [[], true, undefined],
      projectProfiles: [[], true, undefined],
    });
    const notebook = mockNotebookK8sResource({ namespace: 'other-project' });

    const renderResult = testHook(useHardwareProfileBindingState)(notebook);

    expect(mockUseHardwareProfiles).toHaveBeenLastCalledWith(undefined, undefined, {
      dra: 'all',
    });
    expect(renderResult.result.current).toEqual([null, true, undefined]);
  });
});
