import { testHook } from '@odh-dashboard/jest-config/hooks';
import * as pluginCore from '@odh-dashboard/plugin-core';
import type { HardwareProfileKind } from '@odh-dashboard/k8s-core';
import { mockHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import * as useHardwareProfilesModule from '@odh-dashboard/hardware-profiles/pages/useHardwareProfilesByFeatureVisibility';
import { HardwareProfileBindingState } from '@odh-dashboard/hardware-profiles/shared/const';
import { mockNotebookK8sResource } from '#~/__mocks__';
import { useHardwareProfileBindingState } from '#~/concepts/hardwareProfiles/useHardwareProfileBindingState';

jest.mock('@odh-dashboard/plugin-core', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core'),
  useDashboardNamespace: jest.fn(),
}));

jest.mock('@odh-dashboard/hardware-profiles/pages/useHardwareProfilesByFeatureVisibility', () => ({
  ...jest.requireActual(
    '@odh-dashboard/hardware-profiles/pages/useHardwareProfilesByFeatureVisibility',
  ),
  useHardwareProfilesByFeatureVisibility: jest.fn(),
}));

const mockUseDashboardNamespace = jest.mocked(pluginCore.useDashboardNamespace);
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
    mockUseDashboardNamespace.mockReturnValue({ dashboardNamespace: 'opendatahub' });
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

  describe('binding without a namespace', () => {
    const renderNameOnlyBinding = (
      projectProfiles: HardwareProfileKind[],
      globalProfiles: HardwareProfileKind[],
    ) => {
      mockUseDashboardNamespace.mockReturnValue({ dashboardNamespace: 'opendatahub' });
      mockUseHardwareProfiles.mockReturnValue({
        globalProfiles: [globalProfiles, true, undefined],
        projectProfiles: [projectProfiles, true, undefined],
      });
      return testHook(useHardwareProfileBindingState)(
        mockNotebookK8sResource({ hardwareProfileName: 'legacy-profile' }),
      );
    };

    it('should resolve a profile in the dashboard namespace when the workload namespace has none', () => {
      const dashboardProfile = mockHardwareProfile({ name: 'legacy-profile' });

      const renderResult = renderNameOnlyBinding([], [dashboardProfile]);

      expect(mockUseHardwareProfiles).toHaveBeenLastCalledWith(undefined, 'test-project', {
        dra: 'all',
      });
      expect(renderResult.result.current).toEqual([
        { state: undefined, profile: dashboardProfile },
        true,
        undefined,
      ]);
    });

    it('should prefer the profile in the workload namespace over the dashboard namespace', () => {
      const projectProfile = mockHardwareProfile({
        name: 'legacy-profile',
        namespace: 'test-project',
      });
      const dashboardProfile = mockHardwareProfile({ name: 'legacy-profile' });

      const renderResult = renderNameOnlyBinding([projectProfile], [dashboardProfile]);

      expect(renderResult.result.current).toEqual([
        { state: undefined, profile: projectProfile },
        true,
        undefined,
      ]);
    });

    it('should report the binding as deleted when neither namespace has the profile', () => {
      const renderResult = renderNameOnlyBinding([], [mockHardwareProfile({ name: 'other' })]);

      expect(renderResult.result.current).toEqual([
        { state: HardwareProfileBindingState.DELETED, profile: undefined },
        true,
        undefined,
      ]);
    });
  });
});
