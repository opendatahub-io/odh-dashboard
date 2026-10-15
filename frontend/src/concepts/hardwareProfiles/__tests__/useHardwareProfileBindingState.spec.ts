import { testHook } from '@odh-dashboard/jest-config/hooks';
import * as pluginCore from '@odh-dashboard/plugin-core';
import { mockHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { mockNotebookK8sResource } from '#~/__mocks__';
import { useHardwareProfileBindingState } from '#~/concepts/hardwareProfiles/useHardwareProfileBindingState';
import * as useHardwareProfilesModule from '#~/pages/hardwareProfiles/useHardwareProfilesByFeatureVisibility';

jest.mock('@odh-dashboard/plugin-core', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core'),
  useDashboardNamespace: jest.fn(),
}));

jest.mock('#~/pages/hardwareProfiles/useHardwareProfilesByFeatureVisibility', () => ({
  ...jest.requireActual('#~/pages/hardwareProfiles/useHardwareProfilesByFeatureVisibility'),
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
          options?.includeDRA,
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
});
