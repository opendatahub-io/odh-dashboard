import { act } from '@testing-library/react';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { mockHardwareProfile } from '~/__mocks__/mockHardwareProfile';
import { useHardwareProfileConfig } from '~/concepts/hardwareProfiles/useHardwareProfileConfig';
import * as areasUtils from '~/concepts/areas';
import * as reduxSelectors from '~/redux/selectors';
import * as useHardwareProfilesModule from '~/pages/hardwareProfiles/migration/useHardwareProfilesByFeatureVisibility';

jest.mock('~/concepts/areas', () => ({
  ...jest.requireActual('~/concepts/areas'),
  useIsAreaAvailable: jest.fn(),
}));

jest.mock('~/pages/hardwareProfiles/migration/useHardwareProfilesByFeatureVisibility');

jest.mock('~/redux/selectors', () => ({
  useDashboardNamespace: jest.fn(),
}));

const mockUseIsAreaAvailable = jest.mocked(areasUtils.useIsAreaAvailable);
const mockUseHardwareProfiles = jest.mocked(
  useHardwareProfilesModule.useHardwareProfilesByFeatureVisibility,
);
const mockUseDashboardNamespace = jest.mocked(reduxSelectors.useDashboardNamespace);

describe('useHardwareProfileConfig', () => {
  beforeEach(() => {
    mockUseHardwareProfiles.mockReturnValue([[], true, undefined, jest.fn()]);
    mockUseDashboardNamespace.mockReturnValue({ dashboardNamespace: 'test-namespace' });
    mockUseIsAreaAvailable.mockReturnValue({
      status: true,
      devFlags: {},
      featureFlags: {},
      reliantAreas: {},
      requiredComponents: {},
      requiredCapabilities: {},
      customCondition: () => false,
    });
  });

  it('should initialize with default values', () => {
    const renderResult = testHook(useHardwareProfileConfig)();
    const state = renderResult.result.current;

    expect(state).toEqual({
      formData: {
        selectedProfile: undefined,
        useExistingSettings: false,
      },
      initialHardwareProfile: undefined,
      isFormDataValid: false,
      setFormData: expect.any(Function),
      resetFormData: expect.any(Function),
      profilesLoaded: true,
      profilesLoadError: undefined,
    });
  });

  it('should match hardware profile based on resources and tolerations', () => {
    const hardwareProfile = mockHardwareProfile({
      identifiers: [
        {
          identifier: 'cpu',
          minCount: '100m',
          maxCount: '4',
          displayName: 'CPU',
          defaultCount: '1',
        },
        {
          identifier: 'memory',
          minCount: '100Mi',
          maxCount: '4Gi',
          displayName: 'Memory',
          defaultCount: '1Gi',
        },
      ],
      tolerations: [{ key: 'key1', value: 'value1' }],
      nodeSelector: { node: 'value1' },
    });
    mockUseHardwareProfiles.mockReturnValue([[hardwareProfile], true, undefined, jest.fn()]);

    const resources = {
      requests: { cpu: '1', memory: '1Gi' },
      limits: { cpu: '2', memory: '2Gi' },
    };
    const tolerations = [{ key: 'key1', value: 'value1' }];
    const nodeSelector = { node: 'value1' };

    const renderResult = testHook(useHardwareProfileConfig)(
      undefined,
      resources,
      tolerations,
      nodeSelector,
    );
    const state = renderResult.result.current;

    expect(state).toEqual({
      formData: {
        selectedProfile: hardwareProfile,
        useExistingSettings: false,
        resources,
      },
      initialHardwareProfile: hardwareProfile,
      isFormDataValid: true,
      setFormData: expect.any(Function),
      resetFormData: expect.any(Function),
      profilesLoaded: true,
      profilesLoadError: undefined,
    });
  });

  it('should find profile by name when existingHardwareProfileName is provided', () => {
    const hardwareProfile = mockHardwareProfile({
      name: 'test-profile',
    });
    mockUseHardwareProfiles.mockReturnValue([[hardwareProfile], true, undefined, jest.fn()]);

    const resources = {
      requests: { cpu: '1', memory: '1Gi' },
      limits: { cpu: '2', memory: '2Gi' },
    };

    const renderResult = testHook(useHardwareProfileConfig)('test-profile', resources);
    const state = renderResult.result.current;

    expect(state.formData.selectedProfile).toBe(hardwareProfile);
    expect(state.initialHardwareProfile).toBe(hardwareProfile);
  });

  it('should handle hardware profiles not being available', () => {
    mockUseIsAreaAvailable.mockReturnValue({
      status: false,
      devFlags: {},
      featureFlags: {},
      reliantAreas: {},
      requiredComponents: {},
      requiredCapabilities: {},
      customCondition: () => false,
    });

    const renderResult = testHook(useHardwareProfileConfig)();
    const state = renderResult.result.current;

    expect(state.isFormDataValid).toBe(true);
  });

  it('should handle form data updates', () => {
    const renderResult = testHook(useHardwareProfileConfig)();
    const hardwareProfile = mockHardwareProfile({
      name: 'test-profile',
    });

    let state = renderResult.result.current;
    expect(state.formData.selectedProfile).toBeUndefined();

    act(() => {
      state.setFormData('selectedProfile', hardwareProfile);
    });

    state = renderResult.result.current;
    expect(state.formData.selectedProfile).toBe(hardwareProfile);
  });

  it('should reset form data', () => {
    const renderResult = testHook(useHardwareProfileConfig)();

    let state = renderResult.result.current;
    act(() => {
      state.setFormData('useExistingSettings', true);
    });

    state = renderResult.result.current;
    expect(state.formData.useExistingSettings).toBe(true);

    act(() => {
      state.resetFormData();
    });

    state = renderResult.result.current;
    expect(state.formData).toEqual({
      selectedProfile: undefined,
      useExistingSettings: false,
    });
  });
});
