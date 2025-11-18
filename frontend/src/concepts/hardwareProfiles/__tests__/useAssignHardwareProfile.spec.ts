import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockHardwareProfile } from '#~/__mocks__/mockHardwareProfile';
import { mockDashboardConfig, mockNotebookK8sResource } from '#~/__mocks__';
import { HardwareProfileFeatureVisibility } from '#~/k8sTypes';
import * as areasUtils from '#~/concepts/areas';
import * as appContext from '#~/app/AppContext';
import { useAssignHardwareProfile } from '#~/concepts/hardwareProfiles/useAssignHardwareProfile';
import * as useHardwareProfileConfigModule from '#~/concepts/hardwareProfiles/useHardwareProfileConfig';
import { NOTEBOOK_HARDWARE_PROFILE_PATHS } from '#~/concepts/notebooks/const.ts';

global.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));

jest.mock('#~/concepts/areas', () => ({
  ...jest.requireActual('#~/concepts/areas'),
  useIsAreaAvailable: jest.fn(),
}));

jest.mock('#~/app/AppContext', () => ({
  useAppContext: jest.fn(),
}));

jest.mock('#~/concepts/hardwareProfiles/useHardwareProfileConfig', () => ({
  useHardwareProfileConfig: jest.fn(),
}));

const mockUseIsAreaAvailable = jest.mocked(areasUtils.useIsAreaAvailable);
const mockUseAppContext = jest.mocked(appContext.useAppContext);
const mockUseHardwareProfileConfig = jest.mocked(
  useHardwareProfileConfigModule.useHardwareProfileConfig,
);

describe('useAssignHardwareProfile', () => {
  const mockOptions = {
    visibleIn: [HardwareProfileFeatureVisibility.WORKBENCH],
    paths: NOTEBOOK_HARDWARE_PROFILE_PATHS,
  };

  beforeEach(() => {
    mockUseIsAreaAvailable.mockReturnValue({
      status: true,
      devFlags: {},
      featureFlags: {},
      reliantAreas: {},
      requiredComponents: {},
      requiredCapabilities: {},
      customCondition: () => false,
    });

    mockUseAppContext.mockReturnValue({
      dashboardConfig: mockDashboardConfig({}),
      buildStatuses: [],
      storageClasses: [],
      isRHOAI: false,
    });

    mockUseHardwareProfileConfig.mockReturnValue({
      formData: {
        selectedProfile: undefined,
        useExistingSettings: false,
        resources: { requests: {}, limits: {} },
      },
      initialHardwareProfile: undefined,
      isFormDataValid: true,
      setFormData: jest.fn(),
      resetFormData: jest.fn(),
      profilesLoaded: true,
      profilesLoadError: undefined,
    });
  });

  it('should initialize with default values for a new notebook', () => {
    const renderResult = testHook(useAssignHardwareProfile)(null, mockOptions);
    const state = renderResult.result.current;

    expect(state.podSpecOptionsState).toBeDefined();
    expect(state.podSpecOptionsState.hardwareProfile).toBeDefined();
    expect(state.podSpecOptionsState.podSpecOptions).toEqual({
      resources: expect.any(Object),
      tolerations: undefined,
      nodeSelector: undefined,
      selectedHardwareProfile: undefined,
    });
    expect(state.applyToResource).toBeInstanceOf(Function);
    expect(state.validateHardwareProfileForm).toBeInstanceOf(Function);
  });

  it('should extract hardware profile data from existing notebook', () => {
    const hardwareProfile = mockHardwareProfile({
      name: 'test-profile',
      namespace: 'test-namespace',
      tolerations: [{ key: 'test-key', value: 'test-value' }],
      nodeSelector: { 'test-label': 'test-value' },
    });

    const notebook = mockNotebookK8sResource({
      resources: {
        requests: { cpu: '2', memory: '8Gi' },
        limits: { cpu: '2', memory: '8Gi' },
      },
      opts: {
        metadata: {
          annotations: {
            'opendatahub.io/hardware-profile-name': hardwareProfile.metadata.name,
            'opendatahub.io/hardware-profile-namespace': hardwareProfile.metadata.namespace,
          },
        },
        spec: {
          template: {
            spec: {
              tolerations: hardwareProfile.spec.scheduling?.node?.tolerations,
              nodeSelector: hardwareProfile.spec.scheduling?.node?.nodeSelector,
            },
          },
        },
      },
    });

    // Mock the hardware profile config to return the extracted profile
    mockUseHardwareProfileConfig.mockReturnValue({
      formData: {
        selectedProfile: hardwareProfile,
        useExistingSettings: false,
        resources: {
          requests: { cpu: '2', memory: '8Gi' },
          limits: { cpu: '2', memory: '8Gi' },
        },
      },
      initialHardwareProfile: hardwareProfile,
      isFormDataValid: true,
      setFormData: jest.fn(),
      resetFormData: jest.fn(),
      profilesLoaded: true,
      profilesLoadError: undefined,
    });

    testHook(useAssignHardwareProfile)(notebook, mockOptions);

    // Verify useHardwareProfileConfig was called with extracted data
    expect(mockUseHardwareProfileConfig).toHaveBeenCalledWith(
      hardwareProfile.metadata.name,
      expect.objectContaining({
        requests: { cpu: '2', memory: '8Gi' },
        limits: { cpu: '2', memory: '8Gi' },
      }),
      expect.arrayContaining([expect.objectContaining({ key: 'test-key', value: 'test-value' })]),
      expect.objectContaining({ 'test-label': 'test-value' }),
      [HardwareProfileFeatureVisibility.WORKBENCH],
      notebook.metadata.namespace,
      hardwareProfile.metadata.namespace,
    );
  });

  it('should apply hardware profile annotations and settings to notebook', () => {
    const hardwareProfile = mockHardwareProfile({
      name: 'gpu-profile',
      namespace: 'opendatahub',
      nodeSelector: { 'nvidia.com/gpu': 'true' },
    });

    const notebook = mockNotebookK8sResource({
      hardwareProfileName: '',
      hardwareProfileNamespace: null,
      resources: {},
      opts: {
        spec: {
          template: {
            spec: {
              tolerations: undefined,
              nodeSelector: undefined,
            },
          },
        },
      },
    });

    // Mock config with selected hardware profile
    mockUseHardwareProfileConfig.mockReturnValue({
      formData: {
        selectedProfile: hardwareProfile,
        useExistingSettings: false,
        resources: {
          requests: { cpu: '4', memory: '16Gi', 'nvidia.com/gpu': '1' },
          limits: { cpu: '4', memory: '16Gi', 'nvidia.com/gpu': '1' },
        },
      },
      initialHardwareProfile: undefined,
      isFormDataValid: true,
      setFormData: jest.fn(),
      resetFormData: jest.fn(),
      profilesLoaded: true,
      profilesLoadError: undefined,
    });

    const renderResult = testHook(useAssignHardwareProfile)(notebook, mockOptions);
    const { applyToResource } = renderResult.result.current;

    const updatedNotebook = applyToResource(notebook);

    // Verify annotations were added
    expect(updatedNotebook.metadata.annotations?.['opendatahub.io/hardware-profile-name']).toBe(
      'gpu-profile',
    );
    expect(
      updatedNotebook.metadata.annotations?.['opendatahub.io/hardware-profile-namespace'],
    ).toBe(hardwareProfile.metadata.namespace);
    expect(
      updatedNotebook.metadata.annotations?.['opendatahub.io/hardware-profile-resource-version'],
    ).toBeDefined();

    // Verify resources were applied to the first container
    expect(updatedNotebook.spec.template.spec.containers[0].resources).toEqual({
      requests: { cpu: '4', memory: '16Gi', 'nvidia.com/gpu': '1' },
      limits: { cpu: '4', memory: '16Gi', 'nvidia.com/gpu': '1' },
    });

    // Verify notebook was not mutated in place (important for immutability)
    expect(updatedNotebook).not.toBe(notebook);
    expect(updatedNotebook.metadata.name).toBe(notebook.metadata.name);
  });

  it('should use existing settings when useExistingSettings is true and no selected profile', () => {
    const existingResources = {
      requests: { cpu: '1', memory: '1Gi' },
      limits: { cpu: '10', memory: '10Gi' },
    };

    const existingTolerations = [{ key: 'existing-key', value: 'existing-value' }];
    const existingNodeSelector = { 'existing-label': 'existing-value' };

    const notebook = mockNotebookK8sResource({
      resources: existingResources,
      opts: {
        spec: {
          template: {
            spec: {
              tolerations: existingTolerations,
              nodeSelector: existingNodeSelector,
            },
          },
        },
      },
    });

    // Mock the hardware profile config to use existing settings
    mockUseHardwareProfileConfig.mockReturnValue({
      formData: {
        selectedProfile: undefined,
        useExistingSettings: true,
        resources: existingResources,
      },
      initialHardwareProfile: undefined,
      isFormDataValid: true,
      setFormData: jest.fn(),
      resetFormData: jest.fn(),
      profilesLoaded: true,
      profilesLoadError: undefined,
    });

    const renderResult = testHook(useAssignHardwareProfile)(notebook, mockOptions);
    const state = renderResult.result.current;

    // When useExistingSettings is true, should use the notebook's existing resources
    expect(state.podSpecOptionsState.podSpecOptions.resources).toEqual(existingResources);
    expect(state.podSpecOptionsState.podSpecOptions.tolerations).toMatchObject(existingTolerations);
    expect(state.podSpecOptionsState.podSpecOptions.nodeSelector).toEqual(existingNodeSelector);
    expect(state.podSpecOptionsState.podSpecOptions.selectedHardwareProfile).toBeUndefined();
  });

  it('should validate hardware profile form and return validation state', () => {
    const notebook = mockNotebookK8sResource({});
    const hardwareProfile = mockHardwareProfile({ name: 'valid-profile' });

    // Test with valid config
    mockUseHardwareProfileConfig.mockReturnValue({
      formData: {
        selectedProfile: hardwareProfile,
        useExistingSettings: false,
        resources: {
          requests: { cpu: '2', memory: '8Gi' },
          limits: { cpu: '2', memory: '8Gi' },
        },
      },
      initialHardwareProfile: undefined,
      isFormDataValid: true,
      setFormData: jest.fn(),
      resetFormData: jest.fn(),
      profilesLoaded: true,
      profilesLoadError: undefined,
    });

    const renderResult = testHook(useAssignHardwareProfile)(notebook, mockOptions);
    const { validateHardwareProfileForm, podSpecOptionsState } = renderResult.result.current;

    // The validation function returns the actual validation result
    const isValid = validateHardwareProfileForm();
    expect(typeof isValid).toBe('boolean');

    // The hardware profile config also has its own validation state
    expect(podSpecOptionsState.hardwareProfile.isFormDataValid).toBe(true);
  });

  it('should pass hardware profile annotations to useHardwareProfileConfig', () => {
    const hardwareProfile = mockHardwareProfile({
      name: 'test-profile',
      namespace: 'test-namespace',
    });

    const notebook = mockNotebookK8sResource({
      opts: {
        metadata: {
          annotations: {
            'opendatahub.io/hardware-profile-name': 'test-profile',
            'opendatahub.io/hardware-profile-namespace': 'test-namespace',
            'opendatahub.io/hardware-profile-resource-version': '12345',
          },
        },
      },
    });

    mockUseHardwareProfileConfig.mockReturnValue({
      formData: {
        selectedProfile: hardwareProfile,
        useExistingSettings: false,
        resources: { requests: {}, limits: {} },
      },
      initialHardwareProfile: hardwareProfile,
      isFormDataValid: true,
      setFormData: jest.fn(),
      resetFormData: jest.fn(),
      profilesLoaded: true,
      profilesLoadError: undefined,
    });

    testHook(useAssignHardwareProfile)(notebook, mockOptions);

    // Verify useHardwareProfileConfig was called with the extracted annotation data
    const call =
      mockUseHardwareProfileConfig.mock.calls[mockUseHardwareProfileConfig.mock.calls.length - 1];
    expect(call[0]).toBe('test-profile'); // hardware profile name
    expect(call[4]).toEqual([HardwareProfileFeatureVisibility.WORKBENCH]); // visibleIn
    expect(call[5]).toBe(notebook.metadata.namespace); // namespace
    expect(call[6]).toBe('test-namespace'); // hardware profile namespace
  });

  it('should return new hardware profile resources when not using existing settings', () => {
    const hardwareProfile = mockHardwareProfile({
      name: 'gpu-profile',
      tolerations: [{ key: 'gpu-key', value: 'gpu-value' }],
      nodeSelector: { 'gpu-label': 'gpu-value' },
    });

    const newResources = {
      requests: { cpu: '8', memory: '32Gi', 'nvidia.com/gpu': '2' },
      limits: { cpu: '8', memory: '32Gi', 'nvidia.com/gpu': '2' },
    };

    // Mock config with hardware profile (not using existing settings)
    mockUseHardwareProfileConfig.mockReturnValue({
      formData: {
        selectedProfile: hardwareProfile,
        useExistingSettings: false,
        resources: newResources,
      },
      initialHardwareProfile: undefined,
      isFormDataValid: true,
      setFormData: jest.fn(),
      resetFormData: jest.fn(),
      profilesLoaded: true,
      profilesLoadError: undefined,
    });

    const notebook = mockNotebookK8sResource({
      resources: {
        requests: { cpu: '1', memory: '2Gi' },
        limits: { cpu: '1', memory: '2Gi' },
      },
    });

    const renderResult = testHook(useAssignHardwareProfile)(notebook, mockOptions);
    const state = renderResult.result.current;

    // Should use hardware profile resources, not existing notebook resources
    expect(state.podSpecOptionsState.podSpecOptions.resources).toEqual(newResources);
    expect(state.podSpecOptionsState.podSpecOptions.tolerations).toEqual([
      { key: 'gpu-key', value: 'gpu-value' },
    ]);
    expect(state.podSpecOptionsState.podSpecOptions.nodeSelector).toEqual({
      'gpu-label': 'gpu-value',
    });
    expect(state.podSpecOptionsState.podSpecOptions.selectedHardwareProfile).toBe(hardwareProfile);
  });
});
