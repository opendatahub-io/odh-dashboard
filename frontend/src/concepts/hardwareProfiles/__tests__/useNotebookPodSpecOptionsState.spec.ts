import { testHook } from '#~/__tests__/unit/testUtils/hooks';
import { mockHardwareProfile } from '#~/__mocks__/mockHardwareProfile';
import { mockDashboardConfig, mockNotebookK8sResource } from '#~/__mocks__';
import { DEFAULT_NOTEBOOK_SIZES } from '#~/pages/projects/screens/spawner/const';
import { Notebook } from '#~/types';
import * as areasUtils from '#~/concepts/areas';
import * as appContext from '#~/app/AppContext';
import { useNotebookSizeState } from '#~/pages/projects/screens/spawner/useNotebookSizeState';
import { usePreferredNotebookSize } from '#~/pages/notebookController/screens/server/usePreferredNotebookSize';
import useNotebookAcceleratorProfileFormState from '#~/pages/projects/screens/detail/notebooks/useNotebookAcceleratorProfileFormState';
import { useNotebookPodSpecOptionsState } from '#~/concepts/hardwareProfiles/useNotebookPodSpecOptionsState';
import useNotebookHardwareProfileConfig from '#~/concepts/hardwareProfiles/useNotebookHardwareProfileConfig';

global.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));

jest.mock('#~/concepts/areas', () => ({
  ...jest.requireActual('#~/concepts/areas'),
  useIsAreaAvailable: jest.fn(),
}));

jest.mock('#~/app/AppContext', () => ({
  useAppContext: jest.fn(),
}));

jest.mock('#~/pages/projects/screens/spawner/useNotebookSizeState', () => ({
  useNotebookSizeState: jest.fn(),
}));

jest.mock('#~/pages/notebookController/screens/server/usePreferredNotebookSize', () => ({
  usePreferredNotebookSize: jest.fn(),
}));

jest.mock('../useNotebookHardwareProfileConfig', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock(
  '#~/pages/projects/screens/detail/notebooks/useNotebookAcceleratorProfileFormState',
  () => ({
    __esModule: true,
    default: jest.fn(),
  }),
);

const mockUseIsAreaAvailable = jest.mocked(areasUtils.useIsAreaAvailable);
const mockUseAppContext = jest.mocked(appContext.useAppContext);
const mockUseNotebookSizeState = jest.mocked(useNotebookSizeState);
const mockUsePreferredNotebookSize = jest.mocked(usePreferredNotebookSize);
const mockUseHardwareProfileConfig = jest.mocked(useNotebookHardwareProfileConfig);
const mockUseNotebookAcceleratorProfileFormState = jest.mocked(
  useNotebookAcceleratorProfileFormState,
);

describe('useNotebookPodSpecOptionsState', () => {
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
        notebookSizes: DEFAULT_NOTEBOOK_SIZES,
      }),
      buildStatuses: [],
      storageClasses: [],
      isRHOAI: false,
    });

    mockUseNotebookSizeState.mockReturnValue({
      selectedSize: DEFAULT_NOTEBOOK_SIZES[0],
      setSelectedSize: jest.fn(),
      sizes: DEFAULT_NOTEBOOK_SIZES,
    });

    mockUsePreferredNotebookSize.mockReturnValue({
      selectedSize: DEFAULT_NOTEBOOK_SIZES[0],
      setSelectedSize: jest.fn(),
      sizes: DEFAULT_NOTEBOOK_SIZES,
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

    mockUseNotebookAcceleratorProfileFormState.mockReturnValue({
      formData: { profile: undefined, count: 0, useExistingSettings: false },
      initialState: {
        acceleratorProfile: undefined,
        acceleratorProfiles: [],
        count: 0,
        unknownProfileDetected: true,
      },
      loaded: true,
      loadError: undefined,
      setFormData: jest.fn(),
      resetFormData: jest.fn(),
      refresh: jest.fn(),
    });
  });

  it('should initialize with default values', () => {
    const renderResult = testHook(useNotebookPodSpecOptionsState)();
    const state = renderResult.result.current;

    expect(state).toEqual({
      notebooksSize: expect.any(Object),
      acceleratorProfile: expect.any(Object),
      hardwareProfile: expect.any(Object),
      podSpecOptions: {
        resources: {
          requests: {},
          limits: {},
        },
        selectedHardwareProfile: undefined,
      },
    });
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

    const renderResult = testHook(useNotebookPodSpecOptionsState)();
    const state = renderResult.result.current;

    expect(state.podSpecOptions).toEqual({
      resources: {
        requests: {
          cpu: '1',
          memory: '1Gi',
        },
        limits: {
          cpu: '10',
          memory: '10Gi',
        },
      },
      tolerations: hardwareProfile.spec.tolerations,
      nodeSelector: hardwareProfile.spec.nodeSelector,
      selectedHardwareProfile: hardwareProfile,
    });
  });

  it('should use existing settings when useExistingSettings is true', () => {
    const resources = {
      requests: {
        cpu: '1',
        memory: '1Gi',
      },
      limits: { cpu: '10', memory: '10Gi' },
    };
    const notebook = mockNotebookK8sResource({
      resources,
      opts: {
        spec: {
          template: {
            spec: {
              tolerations: [{ key: 'existing-key', value: 'existing-value' }],
              nodeSelector: { 'existing-label': 'existing-value' },
            },
          },
        },
      },
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

    const renderResult = testHook(useNotebookPodSpecOptionsState)(notebook as Notebook);
    const state = renderResult.result.current;

    expect(state.podSpecOptions).toMatchObject({
      resources: notebook.spec.template.spec.containers[0].resources,
      tolerations: notebook.spec.template.spec.tolerations,
      nodeSelector: notebook.spec.template.spec.nodeSelector,
    });
  });

  it('should use legacy pod spec options when hardware profiles are not available', () => {
    mockUseIsAreaAvailable.mockReturnValue({
      status: false,
      devFlags: {},
      featureFlags: {},
      reliantAreas: {},
      requiredComponents: {},
      requiredCapabilities: {},
      customCondition: () => false,
    });

    const renderResult = testHook(useNotebookPodSpecOptionsState)();
    const state = renderResult.result.current;

    expect(state.podSpecOptions).toEqual({
      resources: expect.any(Object),
      tolerations: [
        {
          key: 'NotebooksOnlyChange',
          operator: 'Exists',
          effect: 'NoSchedule',
        },
      ],
      nodeSelector: {},
      lastSizeSelection: expect.any(String),
      selectedAcceleratorProfile: undefined,
      selectedHardwareProfile: undefined,
    });
  });
});
