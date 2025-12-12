import { act } from '@testing-library/react';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockHardwareProfile } from '#~/__mocks__/mockHardwareProfile';
import { useHardwareProfileConfig } from '#~/concepts/hardwareProfiles/useHardwareProfileConfig';
import * as areasUtils from '#~/concepts/areas';
import * as reduxSelectors from '#~/redux/selectors';
import * as useHardwareProfilesModule from '#~/pages/hardwareProfiles/useHardwareProfilesByFeatureVisibility';

jest.mock('#~/concepts/areas', () => ({
  ...jest.requireActual('#~/concepts/areas'),
  useIsAreaAvailable: jest.fn(),
}));

jest.mock('#~/pages/hardwareProfiles/useHardwareProfilesByFeatureVisibility');

jest.mock('#~/redux/selectors', () => ({
  useDashboardNamespace: jest.fn(),
}));

const mockUseIsAreaAvailable = jest.mocked(areasUtils.useIsAreaAvailable);
const mockUseHardwareProfiles = jest.mocked(
  useHardwareProfilesModule.useHardwareProfilesByFeatureVisibility,
);
const mockUseDashboardNamespace = jest.mocked(reduxSelectors.useDashboardNamespace);

describe('useHardwareProfileConfig', () => {
  beforeEach(() => {
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[], true, undefined],
    });
    mockUseDashboardNamespace.mockReturnValue({ dashboardNamespace: 'opendatahub' });
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
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[hardwareProfile], true, undefined],
    });

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
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[hardwareProfile], true, undefined],
    });

    const resources = {
      requests: { cpu: '1', memory: '1Gi' },
      limits: { cpu: '2', memory: '2Gi' },
    };

    const renderResult = testHook(useHardwareProfileConfig)(
      'test-profile',
      resources,
      undefined,
      undefined,
      undefined,
      undefined,
      hardwareProfile.metadata.namespace,
    );
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

    expect(state.isFormDataValid).toBe(false);
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

  it('should merge new identifiers from updated hardware profile with existing resources', () => {
    const hardwareProfile = mockHardwareProfile({
      name: 'updated-profile',
      identifiers: [
        {
          identifier: 'cpu',
          minCount: '1',
          maxCount: '4',
          displayName: 'CPU',
          defaultCount: '2',
        },
        {
          identifier: 'memory',
          minCount: '1Gi',
          maxCount: '8Gi',
          displayName: 'Memory',
          defaultCount: '4Gi',
        },
        {
          identifier: 'nvidia.com/gpu',
          minCount: 1,
          maxCount: 2,
          displayName: 'GPU',
          defaultCount: 1,
        },
      ],
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[hardwareProfile], true, undefined],
    });
    const existingResources = {
      requests: { cpu: '2', memory: '4Gi' },
      limits: { cpu: '2', memory: '4Gi' },
    };

    const renderResult = testHook(useHardwareProfileConfig)(
      'updated-profile',
      existingResources,
      undefined,
      undefined,
      undefined,
      undefined,
      hardwareProfile.metadata.namespace,
    );
    const state = renderResult.result.current;

    expect(state.formData.selectedProfile).toBe(hardwareProfile);
    expect(state.initialHardwareProfile).toBe(hardwareProfile);
    expect(state.formData.useExistingSettings).toBe(false);

    // Resources should be merged: existing CPU/Memory preserved, new GPU added with default value
    expect(state.formData.resources).toEqual({
      requests: {
        cpu: '2',
        memory: '4Gi',
        'nvidia.com/gpu': 1,
      },
      limits: {
        cpu: '2',
        memory: '4Gi',
        'nvidia.com/gpu': 1,
      },
    });
  });

  it('should clear notebook resources when hardware profile has all identifiers removed', () => {
    const emptyProfile = mockHardwareProfile({
      name: 'empty-profile',
      identifiers: [],
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[emptyProfile], true, undefined],
    });

    const existingResources = {
      requests: { cpu: '2', memory: '4Gi' },
      limits: { cpu: '2', memory: '4Gi' },
    };

    const renderResult = testHook(useHardwareProfileConfig)(
      'empty-profile',
      existingResources,
      undefined,
      undefined,
      undefined,
      undefined,
      emptyProfile.metadata.namespace,
    );
    const state = renderResult.result.current;

    expect(state.formData.selectedProfile).toBe(emptyProfile);
    expect(state.initialHardwareProfile).toBe(emptyProfile);
    expect(state.formData.useExistingSettings).toBe(false);

    // Resources should be cleared since profile has no identifiers
    expect(state.formData.resources).toEqual({
      requests: {},
      limits: {},
    });
  });

  it('should not change existing resources when hardware profile matches container resources', () => {
    const profile = mockHardwareProfile({
      name: 'standard-profile',
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          minCount: '1',
          maxCount: '8',
          defaultCount: '2',
        },
        {
          displayName: 'Memory',
          identifier: 'memory',
          minCount: '2Gi',
          maxCount: '16Gi',
          defaultCount: '4Gi',
        },
      ],
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[profile], true, undefined],
    });

    const existingResources = {
      requests: { cpu: '2', memory: '4Gi' },
      limits: { cpu: '2', memory: '4Gi' },
    };

    const renderResult = testHook(useHardwareProfileConfig)(
      'standard-profile',
      existingResources,
      undefined,
      undefined,
      undefined,
      undefined,
      profile.metadata.namespace,
    );
    const state = renderResult.result.current;

    expect(state.formData.selectedProfile).toBe(profile);
    expect(state.formData.resources).toEqual({
      requests: { cpu: '2', memory: '4Gi' },
      limits: { cpu: '2', memory: '4Gi' },
    });
  });

  it('should add new GPU identifier when admin adds it to hardware profile', () => {
    // Admin adds GPU to profile after workload creation
    const profileWithGPU = mockHardwareProfile({
      name: 'profile-with-gpu',
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          minCount: '1',
          maxCount: '8',
          defaultCount: '2',
        },
        {
          displayName: 'Memory',
          identifier: 'memory',
          minCount: '2Gi',
          maxCount: '16Gi',
          defaultCount: '4Gi',
        },
        {
          displayName: 'GPU',
          identifier: 'nvidia.com/gpu',
          minCount: 1,
          maxCount: 4,
          defaultCount: 1,
        },
      ],
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[profileWithGPU], true, undefined],
    });

    const existingResources = {
      requests: { cpu: '2', memory: '4Gi' },
      limits: { cpu: '2', memory: '4Gi' },
    };

    const renderResult = testHook(useHardwareProfileConfig)(
      'profile-with-gpu',
      existingResources,
      undefined,
      undefined,
      undefined,
      undefined,
      profileWithGPU.metadata.namespace,
    );
    const state = renderResult.result.current;

    expect(state.formData.resources).toEqual({
      requests: { cpu: '2', memory: '4Gi', 'nvidia.com/gpu': 1 },
      limits: { cpu: '2', memory: '4Gi', 'nvidia.com/gpu': 1 },
    });
  });

  it('should remove orphaned identifiers when admin removes them from hardware profile', () => {
    // Admin removes memory and GPU, only CPU remains
    const profileCpuOnly = mockHardwareProfile({
      name: 'cpu-only-profile',
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          minCount: '1',
          maxCount: '8',
          defaultCount: '2',
        },
      ],
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[profileCpuOnly], true, undefined],
    });

    const existingResources = {
      requests: { cpu: '2', memory: '4Gi', 'nvidia.com/gpu': 1 },
      limits: { cpu: '2', memory: '4Gi', 'nvidia.com/gpu': 1 },
    };

    const renderResult = testHook(useHardwareProfileConfig)(
      'cpu-only-profile',
      existingResources,
      undefined,
      undefined,
      undefined,
      undefined,
      profileCpuOnly.metadata.namespace,
    );
    const state = renderResult.result.current;

    // Only CPU should remain, orphans removed
    expect(state.formData.resources).toEqual({
      requests: { cpu: '2' },
      limits: { cpu: '2' },
    });
  });

  it('should clear all resources when admin removes all identifiers from hardware profile', () => {
    const emptyProfile = mockHardwareProfile({
      name: 'empty-profile',
      identifiers: [],
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[emptyProfile], true, undefined],
    });

    const existingResources = {
      requests: { cpu: '2', memory: '4Gi' },
      limits: { cpu: '2', memory: '4Gi' },
    };

    const renderResult = testHook(useHardwareProfileConfig)(
      'empty-profile',
      existingResources,
      undefined,
      undefined,
      undefined,
      undefined,
      emptyProfile.metadata.namespace,
    );
    const state = renderResult.result.current;

    expect(state.formData.resources).toEqual({
      requests: {},
      limits: {},
    });
  });

  it('should preserve customized resources when hardware profile has not changed', () => {
    // User customized CPU to 4 and memory to 8Gi (defaults were 2, 4Gi)
    const profile = mockHardwareProfile({
      name: 'standard-profile',
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          minCount: '1',
          maxCount: '8',
          defaultCount: '2',
        },
        {
          displayName: 'Memory',
          identifier: 'memory',
          minCount: '2Gi',
          maxCount: '16Gi',
          defaultCount: '4Gi',
        },
      ],
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[profile], true, undefined],
    });

    const existingResources = {
      requests: { cpu: '4', memory: '8Gi' }, // User customized values
      limits: { cpu: '4', memory: '8Gi' },
    };

    const renderResult = testHook(useHardwareProfileConfig)(
      'standard-profile',
      existingResources,
      undefined,
      undefined,
      undefined,
      undefined,
      profile.metadata.namespace,
    );
    const state = renderResult.result.current;

    // Customized values should be preserved
    expect(state.formData.resources).toEqual({
      requests: { cpu: '4', memory: '8Gi' },
      limits: { cpu: '4', memory: '8Gi' },
    });
  });

  it('should preserve customized resources and add new GPU when admin adds identifier', () => {
    // User had customized CPU and memory, admin adds GPU
    const profileWithGPU = mockHardwareProfile({
      name: 'profile-with-gpu',
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          minCount: '1',
          maxCount: '8',
          defaultCount: '2',
        },
        {
          displayName: 'Memory',
          identifier: 'memory',
          minCount: '2Gi',
          maxCount: '16Gi',
          defaultCount: '4Gi',
        },
        {
          displayName: 'GPU',
          identifier: 'nvidia.com/gpu',
          minCount: 1,
          maxCount: 4,
          defaultCount: 1,
        },
      ],
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[profileWithGPU], true, undefined],
    });

    const existingResources = {
      requests: { cpu: '4', memory: '8Gi' }, // User customized values
      limits: { cpu: '4', memory: '8Gi' },
    };

    const renderResult = testHook(useHardwareProfileConfig)(
      'profile-with-gpu',
      existingResources,
      undefined,
      undefined,
      undefined,
      undefined,
      profileWithGPU.metadata.namespace,
    );
    const state = renderResult.result.current;

    // Customizations preserved, GPU added with default
    expect(state.formData.resources).toEqual({
      requests: { cpu: '4', memory: '8Gi', 'nvidia.com/gpu': 1 },
      limits: { cpu: '4', memory: '8Gi', 'nvidia.com/gpu': 1 },
    });
  });

  it('should preserve only customized CPU when admin removes other identifiers', () => {
    // User had customized all three, admin removes memory and GPU
    const profileCpuOnlyCustomized = mockHardwareProfile({
      name: 'cpu-only-profile-customized',
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          minCount: '1',
          maxCount: '8',
          defaultCount: '2',
        },
      ],
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[profileCpuOnlyCustomized], true, undefined],
    });

    const existingResources = {
      requests: { cpu: '4', memory: '8Gi', 'nvidia.com/gpu': 2 }, // All customized
      limits: { cpu: '4', memory: '8Gi', 'nvidia.com/gpu': 2 },
    };

    const renderResult = testHook(useHardwareProfileConfig)(
      'cpu-only-profile-customized',
      existingResources,
      undefined,
      undefined,
      undefined,
      undefined,
      profileCpuOnlyCustomized.metadata.namespace,
    );
    const state = renderResult.result.current;

    // Only customized CPU preserved, orphans removed
    expect(state.formData.resources).toEqual({
      requests: { cpu: '4' },
      limits: { cpu: '4' },
    });
  });

  it('should clear all customized resources when admin removes all identifiers', () => {
    // User had customizations, admin removes all identifiers
    const emptyProfile = mockHardwareProfile({
      name: 'empty-profile',
      identifiers: [],
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[emptyProfile], true, undefined],
    });

    const existingResources = {
      requests: { cpu: '4', memory: '8Gi' }, // User customized
      limits: { cpu: '4', memory: '8Gi' },
    };

    const renderResult = testHook(useHardwareProfileConfig)(
      'empty-profile',
      existingResources,
      undefined,
      undefined,
      undefined,
      undefined,
      emptyProfile.metadata.namespace,
    );
    const state = renderResult.result.current;

    // All resources cleared, customizations lost
    expect(state.formData.resources).toEqual({
      requests: {},
      limits: {},
    });
  });

  it('should preserve customized resources when admin changes min/max/default constraints', () => {
    // User customized to cpu: 4, admin changes constraints (user value still valid)
    const profileWithNewConstraints = mockHardwareProfile({
      name: 'updated-constraints-profile',
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          minCount: '2',
          maxCount: '6',
          defaultCount: '3',
        }, // Changed from 1-8, default 2
        {
          displayName: 'Memory',
          identifier: 'memory',
          minCount: '4Gi',
          maxCount: '12Gi',
          defaultCount: '6Gi',
        }, // Changed from 2-16, default 4
      ],
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[profileWithNewConstraints], true, undefined],
    });

    const existingResources = {
      requests: { cpu: '4', memory: '8Gi' }, // User customized (still within new ranges)
      limits: { cpu: '4', memory: '8Gi' },
    };

    const renderResult = testHook(useHardwareProfileConfig)(
      'updated-constraints-profile',
      existingResources,
      undefined,
      undefined,
      undefined,
      undefined,
      profileWithNewConstraints.metadata.namespace,
    );
    const state = renderResult.result.current;

    expect(state.formData.resources).toEqual({
      requests: { cpu: '4', memory: '8Gi' },
      limits: { cpu: '4', memory: '8Gi' },
    });
  });
});
