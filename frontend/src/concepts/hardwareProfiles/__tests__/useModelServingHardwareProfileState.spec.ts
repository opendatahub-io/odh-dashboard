import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockHardwareProfile } from '#~/__mocks__/mockHardwareProfile';
import { mockDashboardConfig, mockServingRuntimeK8sResource } from '#~/__mocks__';
import * as areasUtils from '#~/concepts/areas';
import * as appContext from '#~/app/AppContext';
import useServingHardwareProfileConfig from '#~/concepts/hardwareProfiles/useServingHardwareProfileConfig';
import { useModelServingHardwareProfileState } from '#~/concepts/hardwareProfiles/useModelServingPodSpecOptionsState';
import { ModelServingSize } from '#~/pages/modelServing/screens/types';

global.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));

const DEFAULT_MODEL_SIZES: ModelServingSize[] = [
  {
    name: 'Small',
    resources: {
      requests: { cpu: '1', memory: '2Gi' },
      limits: { cpu: '2', memory: '4Gi' },
    },
  },
  {
    name: 'Medium',
    resources: {
      requests: { cpu: '2', memory: '4Gi' },
      limits: { cpu: '4', memory: '8Gi' },
    },
  },
];

jest.mock('#~/concepts/areas', () => ({
  ...jest.requireActual('#~/concepts/areas'),
  useIsAreaAvailable: jest.fn(),
}));

jest.mock('#~/app/AppContext', () => ({
  useAppContext: jest.fn(),
}));

jest.mock('#~/concepts/hardwareProfiles/useServingHardwareProfileConfig', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseIsAreaAvailable = jest.mocked(areasUtils.useIsAreaAvailable);
const mockUseAppContext = jest.mocked(appContext.useAppContext);
const mockUseHardwareProfileConfig = jest.mocked(useServingHardwareProfileConfig);

describe('useModelServingHardwareProfileState', () => {
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
      dashboardConfig: mockDashboardConfig({
        modelServerSizes: DEFAULT_MODEL_SIZES,
      }),
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

  it('should initialize with default values', () => {
    const renderResult = testHook(useModelServingHardwareProfileState)();
    const state = renderResult.result.current;

    expect(state).toEqual({
      modelSize: {
        sizes: DEFAULT_MODEL_SIZES,
        selectedSize: DEFAULT_MODEL_SIZES[0],
        setSelectedSize: expect.any(Function),
      },
      hardwareProfile: expect.any(Object),
      podSpecOptions: {
        resources: {
          requests: {},
          limits: {},
        },
        tolerations: undefined,
        nodeSelector: undefined,
        selectedHardwareProfile: undefined,
      },
    });

    // Ensure no acceleratorProfile property exists
    expect(state).not.toHaveProperty('acceleratorProfile');
  });

  it('should use hardware profile when selected', () => {
    const hardwareProfile = mockHardwareProfile({
      tolerations: [{ key: 'test-key', value: 'test-value' }],
      nodeSelector: { 'test-label': 'test-value' },
    });

    const hwpFormData = {
      selectedProfile: hardwareProfile,
      useExistingSettings: false,
      resources: {
        requests: { cpu: '1', memory: '1Gi' },
        limits: { cpu: '10', memory: '10Gi' },
      },
    };
    mockUseHardwareProfileConfig.mockReturnValue({
      formData: hwpFormData,
      isFormDataValid: true,
      setFormData: jest.fn(),
      resetFormData: jest.fn(),
      profilesLoaded: true,
      profilesLoadError: undefined,
    });

    const renderResult = testHook(useModelServingHardwareProfileState)();
    const state = renderResult.result.current;

    expect(state.podSpecOptions).toEqual({
      resources: {
        requests: { cpu: '1', memory: '1Gi' },
        limits: { cpu: '10', memory: '10Gi' },
      },
      tolerations: hardwareProfile.spec.scheduling?.node?.tolerations,
      nodeSelector: hardwareProfile.spec.scheduling?.node?.nodeSelector,
      selectedHardwareProfile: hardwareProfile,
    });

    // Ensure no accelerator profile properties
    expect(state.podSpecOptions).not.toHaveProperty('selectedAcceleratorProfile');
  });

  it('should use existing settings when useExistingSettings is true', () => {
    const resources = {
      requests: { cpu: '1', memory: '1Gi' },
      limits: { cpu: '10', memory: '10Gi' },
    };
    const servingRuntime = mockServingRuntimeK8sResource({
      resources,
      tolerations: [{ key: 'existing-key', value: 'existing-value' }],
      nodeSelector: { 'existing-label': 'existing-value' },
    });

    mockUseHardwareProfileConfig.mockReturnValue({
      formData: {
        selectedProfile: undefined,
        useExistingSettings: true,
        resources: {
          requests: { cpu: '1000', memory: '1000Gi' },
          limits: { cpu: '1000', memory: '1000Gi' },
        },
      },
      initialHardwareProfile: undefined,
      isFormDataValid: true,
      setFormData: jest.fn(),
      resetFormData: jest.fn(),
      profilesLoaded: true,
      profilesLoadError: undefined,
    });

    const renderResult = testHook(useModelServingHardwareProfileState)(servingRuntime);
    const state = renderResult.result.current;

    expect(state.podSpecOptions).toMatchObject({
      resources: servingRuntime.spec.containers[0].resources,
      tolerations: servingRuntime.spec.tolerations,
      nodeSelector: servingRuntime.spec.nodeSelector,
      selectedHardwareProfile: undefined,
    });
  });

  it('should handle ModelMesh mode with basic resource settings', () => {
    const renderResult = testHook(useModelServingHardwareProfileState)(undefined, undefined, true);
    const state = renderResult.result.current;

    expect(state.podSpecOptions).toEqual({
      resources: {
        requests: {
          cpu: DEFAULT_MODEL_SIZES[0].resources.requests?.cpu,
          memory: DEFAULT_MODEL_SIZES[0].resources.requests?.memory,
        },
        limits: {
          cpu: DEFAULT_MODEL_SIZES[0].resources.limits?.cpu,
          memory: DEFAULT_MODEL_SIZES[0].resources.limits?.memory,
        },
      },
      tolerations: undefined,
      nodeSelector: undefined,
    });

    // Ensure no accelerator profile properties in ModelMesh mode
    expect(state.podSpecOptions).not.toHaveProperty('selectedAcceleratorProfile');
  });

  it('should update model size when setSelectedSize is called', () => {
    const renderResult = testHook(useModelServingHardwareProfileState)();
    const { rerender } = renderResult;

    // Initial state
    expect(renderResult.result.current.modelSize.selectedSize).toEqual(DEFAULT_MODEL_SIZES[0]);

    // Update model size
    renderResult.result.current.modelSize.setSelectedSize(DEFAULT_MODEL_SIZES[1]);
    rerender();

    expect(renderResult.result.current.modelSize.selectedSize).toEqual(DEFAULT_MODEL_SIZES[1]);
  });

  it('should have correct type structure without accelerator profile', () => {
    const renderResult = testHook(useModelServingHardwareProfileState)();
    const state = renderResult.result.current;

    // Check that the state has the expected structure
    expect(state).toHaveProperty('modelSize');
    expect(state).toHaveProperty('hardwareProfile');
    expect(state).toHaveProperty('podSpecOptions');

    // Ensure acceleratorProfile is not present
    expect(state).not.toHaveProperty('acceleratorProfile');

    // Check modelSize structure
    expect(state.modelSize).toHaveProperty('sizes');
    expect(state.modelSize).toHaveProperty('selectedSize');
    expect(state.modelSize).toHaveProperty('setSelectedSize');

    // Check hardwareProfile structure
    expect(state.hardwareProfile).toHaveProperty('formData');
    expect(state.hardwareProfile).toHaveProperty('isFormDataValid');

    // Check podSpecOptions structure
    expect(state.podSpecOptions).toHaveProperty('resources');
    expect(state.podSpecOptions).toHaveProperty('tolerations');
    expect(state.podSpecOptions).toHaveProperty('nodeSelector');
  });
});
