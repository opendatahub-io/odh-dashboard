import { testHook } from '@odh-dashboard/jest-config/hooks';
import React from 'react';
import { mockHardwareProfile } from '#~/__mocks__/mockHardwareProfile';
import { HardwareProfileFeatureVisibility, HardwareProfileKind } from '#~/k8sTypes';
import { useHardwareProfilesByFeatureVisibility } from '#~/pages/hardwareProfiles/useHardwareProfilesByFeatureVisibility';
import { HardwareProfilesContext } from '#~/concepts/hardwareProfiles/HardwareProfilesContext';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';

jest.mock('#~/concepts/hardwareProfiles/HardwareProfilesContext', () => ({
  HardwareProfilesContext: {
    _currentValue: null,
  },
}));

jest.mock('#~/pages/projects/ProjectDetailsContext', () => ({
  ProjectDetailsContext: {
    _currentValue: null,
  },
}));

jest.mock('#~/utilities/useWatchHardwareProfiles', () => ({
  useWatchHardwareProfiles: jest.fn(() => [[], true, undefined]),
}));

jest.mock('#~/redux/selectors', () => ({
  useDashboardNamespace: () => ({ dashboardNamespace: 'opendatahub' }),
}));

const mockContexts = (
  globalProfiles: HardwareProfileKind[],
  globalLoaded = true,
  globalError: Error | undefined = undefined,
  projectOverrides?: Partial<React.ContextType<typeof ProjectDetailsContext>>,
) => {
  jest.spyOn(React, 'useContext').mockImplementation((context: React.Context<unknown>) => {
    if (context === HardwareProfilesContext) {
      return {
        globalHardwareProfiles: [globalProfiles, globalLoaded, globalError],
      };
    }
    if (context === ProjectDetailsContext) {
      return {
        currentProject: { metadata: { name: 'test-project' } },
        projectHardwareProfiles: [[], true, undefined],
        ...projectOverrides,
      };
    }
    return {};
  });
};

describe('useHardwareProfilesByUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all profiles when no use cases specified', () => {
    const profiles = [
      mockHardwareProfile({
        annotations: {
          'opendatahub.io/dashboard-feature-visibility': JSON.stringify([
            HardwareProfileFeatureVisibility.WORKBENCH,
          ]),
        },
      }),
      mockHardwareProfile({
        annotations: {
          'opendatahub.io/dashboard-feature-visibility': JSON.stringify([
            HardwareProfileFeatureVisibility.MODEL_SERVING,
          ]),
        },
      }),
    ];

    mockContexts(profiles);

    const renderResult = testHook(useHardwareProfilesByFeatureVisibility)();
    const { globalProfiles } = renderResult.result.current;
    const [data, loaded, loadError] = globalProfiles;

    expect(data).toEqual(profiles);
    expect(loaded).toBe(true);
    expect(loadError).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should filter profiles by use case', () => {
    const notebookProfile = mockHardwareProfile({
      annotations: {
        'opendatahub.io/dashboard-feature-visibility': JSON.stringify([
          HardwareProfileFeatureVisibility.WORKBENCH,
        ]),
      },
    });
    const servingProfile = mockHardwareProfile({
      annotations: {
        'opendatahub.io/dashboard-feature-visibility': JSON.stringify([
          HardwareProfileFeatureVisibility.MODEL_SERVING,
        ]),
      },
    });

    mockContexts([notebookProfile, servingProfile]);

    const renderResult = testHook(useHardwareProfilesByFeatureVisibility)([
      HardwareProfileFeatureVisibility.WORKBENCH,
    ]);
    const { globalProfiles } = renderResult.result.current;
    const [data] = globalProfiles;

    expect(data).toEqual([notebookProfile]);
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should include profiles with invalid visible-in annotation', () => {
    const invalidProfile = mockHardwareProfile({
      annotations: {
        'opendatahub.io/dashboard-feature-visibility': 'invalid-json',
      },
    });

    mockContexts([invalidProfile]);

    const renderResult = testHook(useHardwareProfilesByFeatureVisibility)([
      HardwareProfileFeatureVisibility.WORKBENCH,
    ]);
    const { globalProfiles } = renderResult.result.current;
    const [data] = globalProfiles;

    expect(data).toEqual([invalidProfile]);
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should include profiles without visible-in annotation', () => {
    const profileWithoutAnnotation = mockHardwareProfile({});

    mockContexts([profileWithoutAnnotation]);

    const renderResult = testHook(useHardwareProfilesByFeatureVisibility)([
      HardwareProfileFeatureVisibility.WORKBENCH,
    ]);
    const { globalProfiles } = renderResult.result.current;
    const [data] = globalProfiles;

    expect(data).toEqual([profileWithoutAnnotation]);
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should handle loading and error states', () => {
    const error = new Error('Test error');
    mockContexts([], false, error);

    const renderResult = testHook(useHardwareProfilesByFeatureVisibility)();
    const { globalProfiles } = renderResult.result.current;
    const [data, loaded, loadError] = globalProfiles;

    expect(data).toEqual([]);
    expect(loaded).toBe(false);
    expect(loadError).toBe(error);
    expect(renderResult).hookToHaveUpdateCount(1);
  });
});
