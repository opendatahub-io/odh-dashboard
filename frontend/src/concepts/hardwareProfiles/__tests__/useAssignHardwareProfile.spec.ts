import { testHook } from '@odh-dashboard/jest-config/hooks';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import {
  HardwareProfileFeatureVisibility,
  IdentifierResourceType,
  TolerationEffect,
  TolerationOperator,
  type NodeSelector,
  type Toleration,
} from '@odh-dashboard/k8s-core';
import * as pluginCore from '@odh-dashboard/plugin-core';
import * as areasUtils from '@odh-dashboard/plugin-core/areas';
import * as useHardwareProfileConfigModule from '@odh-dashboard/hardware-profiles/shared/useHardwareProfileConfig';
import { useResourceClaimTemplateNames } from '@odh-dashboard/hardware-profiles/shared/useResourceClaimTemplateNames';
import { mockHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import { mockNotebookK8sResource } from '#~/__mocks__';
import * as appContext from '#~/app/AppContext';
import { useAssignHardwareProfile } from '#~/concepts/hardwareProfiles/useAssignHardwareProfile';
import { NOTEBOOK_HARDWARE_PROFILE_PATHS } from '#~/concepts/notebooks/const';
import { INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS } from '#~/concepts/hardwareProfiles/const';
import * as useHardwareProfilesModule from '#~/pages/hardwareProfiles/useHardwareProfilesByFeatureVisibility';

global.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));
jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(),
}));
jest.mock('@odh-dashboard/plugin-core', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core'),
  useDashboardNamespace: jest.fn(),
}));
jest.mock('#~/app/AppContext', () => ({
  useAppContext: jest.fn(),
}));
jest.mock('#~/pages/hardwareProfiles/useHardwareProfilesByFeatureVisibility');
jest.mock('@odh-dashboard/hardware-profiles/shared/useResourceClaimTemplateNames', () => ({
  useResourceClaimTemplateNames: jest.fn(),
}));
jest.mock('@odh-dashboard/hardware-profiles/shared/useHardwareProfileConfig', () => ({
  useHardwareProfileConfig: jest.fn(),
}));
const mockUseIsAreaAvailable = jest.mocked(areasUtils.useIsAreaAvailable);
const mockUseAppContext = jest.mocked(appContext.useAppContext);
const mockUseHardwareProfileConfig = jest.mocked(
  useHardwareProfileConfigModule.useHardwareProfileConfig,
);
const mockUseDashboardNamespace = jest.mocked(pluginCore.useDashboardNamespace);
const mockUseHardwareProfiles = jest.mocked(
  useHardwareProfilesModule.useHardwareProfilesByFeatureVisibility,
);
const mockUseResourceClaimTemplateNames = jest.mocked(useResourceClaimTemplateNames);
type TestConfig<T extends K8sResourceCommon> = {
  resourceType: string;
  createMockResource: (opts?: Record<string, unknown>) => T;
  featureVisibility: HardwareProfileFeatureVisibility;
  paths: {
    containerResourcesPath: string;
    tolerationsPath: string;
    nodeSelectorPath: string;
  };
  getAppliedResources: (resource: T) => unknown; // Function to extract resources from the updated resource
};

const createSharedTests = <T extends K8sResourceCommon>(config: TestConfig<T>) => {
  const { resourceType, createMockResource, featureVisibility, paths, getAppliedResources } =
    config;
  const mockOptions = {
    visibleIn: [featureVisibility],
    paths,
  };

  it(`should initialize with default values for a new ${resourceType}`, () => {
    const renderResult = testHook(useAssignHardwareProfile)(null, mockOptions);
    const state = renderResult.result.current;
    expect(state.podSpecOptionsState).toBeDefined();
    expect(state.podSpecOptionsState.hardwareProfile).toBeDefined();
    expect(state.podSpecOptionsState.podSpecOptions).toEqual({
      resources: { requests: {}, limits: {} }, // Default empty resources from formData
      tolerations: undefined,
      nodeSelector: undefined,
      selectedHardwareProfile: undefined,
    });
    expect(state.applyToResource).toBeInstanceOf(Function);
    expect(state.validateHardwareProfileForm).toBeInstanceOf(Function);
    expect(state.loaded).toBe(true);
  });

  it(`should extract hardware profile data from existing ${resourceType}`, () => {
    const hardwareProfile = mockHardwareProfile({
      name: 'test-profile',
      namespace: 'test-namespace',
      tolerations: [{ key: 'test-key', value: 'test-value' }],
      nodeSelector: { 'test-label': 'test-value' },
    });
    const resource = createMockResource({
      resources: {
        requests: { cpu: '2', memory: '8Gi' },
        limits: { cpu: '2', memory: '8Gi' },
      },
      tolerations: hardwareProfile.spec.scheduling?.node?.tolerations,
      nodeSelector: hardwareProfile.spec.scheduling?.node?.nodeSelector,
      hardwareProfileName: hardwareProfile.metadata.name,
      hardwareProfileNamespace: hardwareProfile.metadata.namespace,
    });
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
      excludeDRAProfiles: false,
      existingBinding: {},
      isFormDataValid: true,
      setFormData: jest.fn(),
      resetFormData: jest.fn(),
      profilesLoaded: true,
      profilesLoadError: undefined,
    });
    const renderResult = testHook(useAssignHardwareProfile)(resource, mockOptions);
    const state = renderResult.result.current;
    expect(state.podSpecOptionsState.hardwareProfile.initialHardwareProfile).toEqual(
      hardwareProfile,
    );
    expect(state.podSpecOptionsState.hardwareProfile.formData.selectedProfile).toEqual(
      hardwareProfile,
    );
    expect(state.podSpecOptionsState.hardwareProfile.formData.useExistingSettings).toBe(false);
    expect(state.podSpecOptionsState.hardwareProfile.isFormDataValid).toBe(true);
    expect(state.loaded).toBe(true);
  });

  it(`should apply hardware profile annotations and settings to ${resourceType}`, () => {
    const hardwareProfile = mockHardwareProfile({
      name: 'gpu-profile',
      namespace: 'opendatahub',
      nodeSelector: { 'nvidia.com/gpu': 'true' },
    });
    const resource = createMockResource({
      hardwareProfileName: '',
      hardwareProfileNamespace: undefined,
      resources: undefined,
      tolerations: undefined,
      nodeSelector: undefined,
    });
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
      excludeDRAProfiles: false,
      existingBinding: {},
      isFormDataValid: true,
      setFormData: jest.fn(),
      resetFormData: jest.fn(),
      profilesLoaded: true,
      profilesLoadError: undefined,
    });
    const renderResult = testHook(useAssignHardwareProfile)(resource, mockOptions);
    const { applyToResource, podSpecOptionsState } = renderResult.result.current;
    expect(podSpecOptionsState.hardwareProfile.formData.selectedProfile).toEqual(hardwareProfile);
    expect(podSpecOptionsState.hardwareProfile.formData.resources).toEqual({
      requests: { cpu: '4', memory: '16Gi', 'nvidia.com/gpu': '1' },
      limits: { cpu: '4', memory: '16Gi', 'nvidia.com/gpu': '1' },
    });
    const updatedResource = applyToResource(resource);
    expect(updatedResource.metadata?.annotations?.['opendatahub.io/hardware-profile-name']).toBe(
      'gpu-profile',
    );
    expect(
      updatedResource.metadata?.annotations?.['opendatahub.io/hardware-profile-namespace'],
    ).toBe(hardwareProfile.metadata.namespace);
    expect(
      updatedResource.metadata?.annotations?.['opendatahub.io/hardware-profile-resource-version'],
    ).toBeDefined();
    const appliedResources = getAppliedResources(updatedResource);
    expect(appliedResources).toEqual({
      requests: { cpu: '4', memory: '16Gi', 'nvidia.com/gpu': '1' },
      limits: { cpu: '4', memory: '16Gi', 'nvidia.com/gpu': '1' },
    });
    expect(updatedResource).not.toBe(resource);
    expect(updatedResource.metadata?.name).toBe(resource.metadata?.name);
  });

  it(`should use existing settings when no hardware profile selected for ${resourceType}`, () => {
    const existingResources = {
      requests: { cpu: '1', memory: '1Gi' },
      limits: { cpu: '10', memory: '10Gi' },
    };
    const existingTolerations = [{ key: 'existing-key', value: 'existing-value' }];
    const existingNodeSelector = { 'existing-label': 'existing-value' };

    const resource = createMockResource({
      resources: existingResources,
      tolerations: existingTolerations,
      nodeSelector: existingNodeSelector,
    });
    mockUseHardwareProfileConfig.mockReturnValue({
      formData: {
        selectedProfile: undefined,
        useExistingSettings: true,
        resources: existingResources,
      },
      initialHardwareProfile: undefined,
      excludeDRAProfiles: false,
      existingBinding: {},
      isFormDataValid: true,
      setFormData: jest.fn(),
      resetFormData: jest.fn(),
      profilesLoaded: true,
      profilesLoadError: undefined,
    });
    const renderResult = testHook(useAssignHardwareProfile)(resource, mockOptions);
    const state = renderResult.result.current;
    expect(state.podSpecOptionsState.hardwareProfile.formData.useExistingSettings).toBe(true);
    expect(state.podSpecOptionsState.hardwareProfile.formData.selectedProfile).toBeUndefined();
    expect(state.podSpecOptionsState.podSpecOptions.resources).toEqual(existingResources);
    expect(state.podSpecOptionsState.podSpecOptions.tolerations).toMatchObject(existingTolerations);
    expect(state.podSpecOptionsState.podSpecOptions.nodeSelector).toEqual(existingNodeSelector);
    expect(state.podSpecOptionsState.podSpecOptions.selectedHardwareProfile).toBeUndefined();
  });

  it(`should include tolerations and nodeSelector in podSpecOptions when hardware profile is selected for ${resourceType}`, () => {
    const tolerations: Toleration[] = [
      {
        key: 'special-hardware',
        operator: TolerationOperator.EXISTS,
        effect: TolerationEffect.NO_SCHEDULE,
      },
      {
        key: 'gpu-node',
        value: 'true',
        operator: TolerationOperator.EQUAL,
        effect: TolerationEffect.NO_SCHEDULE,
      },
    ];
    const hardwareProfile = mockHardwareProfile({
      name: 'special-hardware',
      namespace: 'opendatahub',
      tolerations,
      nodeSelector: { 'hardware-type': 'gpu', 'gpu-vendor': 'nvidia' },
    });
    // Create resource WITH the tolerations/nodeSelector from the profile already applied
    const resource = createMockResource({
      tolerations,
      nodeSelector: { 'hardware-type': 'gpu', 'gpu-vendor': 'nvidia' },
    });
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
      excludeDRAProfiles: false,
      existingBinding: {},
      isFormDataValid: true,
      setFormData: jest.fn(),
      resetFormData: jest.fn(),
      profilesLoaded: true,
      profilesLoadError: undefined,
    });
    const renderResult = testHook(useAssignHardwareProfile)(resource, mockOptions);
    const state = renderResult.result.current;
    expect(state.podSpecOptionsState.hardwareProfile.formData.selectedProfile).toEqual(
      hardwareProfile,
    );
    // Tolerations/nodeSelector come from existing resource (passed via assemblePodSpecOptions)
    expect(state.podSpecOptionsState.podSpecOptions.tolerations).toMatchObject(tolerations);
    expect(state.podSpecOptionsState.podSpecOptions.nodeSelector).toEqual({
      'hardware-type': 'gpu',
      'gpu-vendor': 'nvidia',
    });
    expect(state.podSpecOptionsState.podSpecOptions.selectedHardwareProfile).toBe(hardwareProfile);
  });

  it(`should NOT apply customized resources when NO hardware profile is selected for ${resourceType}`, () => {
    const customResources = {
      requests: { cpu: '10', memory: '20Gi' },
      limits: { cpu: '10', memory: '20Gi' },
    };

    mockUseHardwareProfileConfig.mockReturnValue({
      formData: {
        selectedProfile: undefined,
        useExistingSettings: false,
        resources: customResources,
      },
      initialHardwareProfile: undefined,
      excludeDRAProfiles: false,
      existingBinding: {},
      isFormDataValid: true,
      setFormData: jest.fn(),
      resetFormData: jest.fn(),
      profilesLoaded: true,
      profilesLoadError: undefined,
    });

    const resource = createMockResource({
      resources: { requests: { cpu: '1', memory: '2Gi' }, limits: { cpu: '1', memory: '2Gi' } },
    });
    const renderResult = testHook(useAssignHardwareProfile)(resource, mockOptions);
    const { applyToResource, podSpecOptionsState } = renderResult.result.current;

    expect(podSpecOptionsState.podSpecOptions.resources).toEqual({
      requests: { cpu: '10', memory: '20Gi' },
      limits: { cpu: '10', memory: '20Gi' },
    });

    const updatedResource = applyToResource(resource);
    expect(
      updatedResource.metadata?.annotations?.['opendatahub.io/hardware-profile-name'],
    ).toBeUndefined();

    const appliedResources = getAppliedResources(updatedResource);
    expect(appliedResources).toEqual({
      requests: { cpu: '1', memory: '2Gi' },
      limits: { cpu: '1', memory: '2Gi' },
    });
  });
};

describe('useAssignHardwareProfile', () => {
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
      excludeDRAProfiles: false,
      existingBinding: {},
      isFormDataValid: true,
      setFormData: jest.fn(),
      resetFormData: jest.fn(),
      profilesLoaded: true,
      profilesLoadError: undefined,
    });
  });

  it('should keep the resource version when applying the DRA hardware profile of the resolved existing binding', () => {
    const draProfile = mockHardwareProfile({
      name: 'dra-profile',
      namespace: 'opendatahub',
      resourceVersion: '2',
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });
    const notebook = mockNotebookK8sResource({ hardwareProfileName: 'dra-profile' });
    mockUseHardwareProfileConfig.mockReturnValue({
      formData: { selectedProfile: draProfile, useExistingSettings: false },
      initialHardwareProfile: undefined,
      excludeDRAProfiles: false,
      existingBinding: { name: 'dra-profile', namespace: 'opendatahub' },
      isFormDataValid: true,
      setFormData: jest.fn(),
      resetFormData: jest.fn(),
      profilesLoaded: true,
      profilesLoadError: undefined,
    });

    const renderResult = testHook(useAssignHardwareProfile)(notebook, {
      visibleIn: [HardwareProfileFeatureVisibility.WORKBENCH],
      paths: NOTEBOOK_HARDWARE_PROFILE_PATHS,
    });
    const result = renderResult.result.current.applyToResource(notebook);

    expect(result.metadata.annotations?.['opendatahub.io/hardware-profile-namespace']).toBe(
      'opendatahub',
    );
    expect(result.metadata.annotations).not.toHaveProperty(
      'opendatahub.io/hardware-profile-resource-version',
    );
  });

  it('should pass the project to the hardware profile config and report its validity', () => {
    mockUseHardwareProfileConfig.mockReturnValue({
      formData: { selectedProfile: undefined, useExistingSettings: false },
      initialHardwareProfile: undefined,
      excludeDRAProfiles: false,
      existingBinding: {},
      claimTemplateMissingText: 'The claim template single-gpu does not exist in this project.',
      isFormDataValid: false,
      setFormData: jest.fn(),
      resetFormData: jest.fn(),
      profilesLoaded: true,
      profilesLoadError: undefined,
    });

    const renderResult = testHook(useAssignHardwareProfile)(null, {
      visibleIn: [HardwareProfileFeatureVisibility.WORKBENCH],
      paths: NOTEBOOK_HARDWARE_PROFILE_PATHS,
      project: 'test-project',
    });

    expect(mockUseHardwareProfileConfig).toHaveBeenCalledWith(
      undefined,
      undefined,
      undefined,
      undefined,
      [HardwareProfileFeatureVisibility.WORKBENCH],
      undefined,
      undefined,
      { allowDRAProfiles: undefined, project: 'test-project' },
    );
    expect(renderResult.result.current.validateHardwareProfileForm()).toBe(false);
  });

  describe('DRA-bound workloads in read-only views', () => {
    const draProfile = mockHardwareProfile({
      name: 'dra-profile',
      namespace: 'opendatahub',
      identifiers: [
        {
          displayName: 'GPU',
          identifier: 'nvidia.com/gpu',
          minCount: 1,
          maxCount: 2,
          defaultCount: 1,
          resourceType: IdentifierResourceType.ACCELERATOR,
        },
      ],
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });
    const workloadResources = {
      requests: { cpu: '2', memory: '8Gi' },
      limits: { cpu: '4', memory: '16Gi' },
    };
    const binding = {
      resources: workloadResources,
      hardwareProfileName: 'dra-profile',
      hardwareProfileNamespace: 'opendatahub',
    };

    beforeEach(() => {
      mockUseHardwareProfileConfig.mockImplementation(
        jest.requireActual<typeof useHardwareProfileConfigModule>(
          '@odh-dashboard/hardware-profiles/shared/useHardwareProfileConfig',
        ).useHardwareProfileConfig,
      );
      mockUseDashboardNamespace.mockReturnValue({ dashboardNamespace: 'opendatahub' });
      mockUseResourceClaimTemplateNames.mockReturnValue({ status: 'unavailable' });
      mockUseHardwareProfiles.mockReturnValue({
        projectProfiles: [[], true, undefined],
        globalProfiles: [[draProfile], true, undefined],
      });
    });

    it.each([
      [
        'workbench',
        mockNotebookK8sResource(binding),
        HardwareProfileFeatureVisibility.WORKBENCH,
        NOTEBOOK_HARDWARE_PROFILE_PATHS,
      ],
      [
        'model deployment',
        mockInferenceServiceK8sResource(binding),
        HardwareProfileFeatureVisibility.MODEL_SERVING,
        INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS,
      ],
    ])(
      'should keep the own resources of a %s bound to a DRA hardware profile when DRA profiles are excluded',
      (_, resource: K8sResourceCommon, visibility, paths) => {
        const renderResult = testHook(useAssignHardwareProfile)(resource, {
          visibleIn: [visibility],
          paths,
        });
        const { podSpecOptions, hardwareProfile } = renderResult.result.current.podSpecOptionsState;

        expect(hardwareProfile.formData.selectedProfile).toEqual(draProfile);
        expect(hardwareProfile.formData.useExistingSettings).toBe(true);
        expect(podSpecOptions.resources).toEqual(workloadResources);
      },
    );
  });

  describe('Workbenches', () => {
    createSharedTests({
      resourceType: 'notebook',
      createMockResource: (opts) => {
        const notebook = mockNotebookK8sResource(opts || {});
        if (opts?.hardwareProfileName && notebook.metadata.annotations) {
          notebook.metadata.annotations['opendatahub.io/hardware-profile-name'] =
            opts.hardwareProfileName as string;
          notebook.metadata.annotations['opendatahub.io/hardware-profile-namespace'] =
            opts.hardwareProfileNamespace as string;
          notebook.metadata.annotations['opendatahub.io/hardware-profile-resource-version'] =
            '12345';
        }
        if (opts?.tolerations) {
          notebook.spec.template.spec.tolerations = opts.tolerations as Toleration[];
        }
        if (opts?.nodeSelector) {
          notebook.spec.template.spec.nodeSelector = opts.nodeSelector as NodeSelector;
        }
        return notebook;
      },
      featureVisibility: HardwareProfileFeatureVisibility.WORKBENCH,
      paths: NOTEBOOK_HARDWARE_PROFILE_PATHS,
      getAppliedResources: (notebook) => notebook.spec.template.spec.containers[0].resources,
    });
  });

  describe('Model Serving', () => {
    createSharedTests({
      resourceType: 'inference service',
      createMockResource: (opts) => mockInferenceServiceK8sResource(opts || {}),
      featureVisibility: HardwareProfileFeatureVisibility.MODEL_SERVING,
      paths: INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS,
      getAppliedResources: (inferenceService) => inferenceService.spec.predictor.model?.resources,
    });
  });
});
