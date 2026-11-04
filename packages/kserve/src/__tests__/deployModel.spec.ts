import { testHook } from '@odh-dashboard/jest-config/hooks';
import type { ContainerResources, PodSpec } from '@odh-dashboard/k8s-core';
import { useDashboardNamespace } from '@odh-dashboard/plugin-core';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import type { HardwareProfileConfig } from '@odh-dashboard/hardware-profiles/shared';
import { useHardwareProfileConfig } from '@odh-dashboard/hardware-profiles/shared/useHardwareProfileConfig';
import { useResourceClaimTemplateNames } from '@odh-dashboard/hardware-profiles/shared/useResourceClaimTemplateNames';
import { mockHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { useHardwareProfilesByFeatureVisibility } from '@odh-dashboard/hardware-profiles/pages/useHardwareProfilesByFeatureVisibility';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import { assembleInferenceService, type CreatingInferenceServiceObject } from '../deployModel';
import { extractHardwareProfileConfig } from '../hardware';

jest.mock('@odh-dashboard/plugin-core', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core'),
  useDashboardNamespace: jest.fn(),
}));
jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(),
}));
jest.mock('@odh-dashboard/hardware-profiles/pages/useHardwareProfilesByFeatureVisibility');
jest.mock('@odh-dashboard/hardware-profiles/shared/useResourceClaimTemplateNames', () => ({
  useResourceClaimTemplateNames: jest.fn(),
}));

const mockUseDashboardNamespace = jest.mocked(useDashboardNamespace);
const mockUseIsAreaAvailable = jest.mocked(useIsAreaAvailable);
const mockUseHardwareProfiles = jest.mocked(useHardwareProfilesByFeatureVisibility);
const mockUseResourceClaimTemplateNames = jest.mocked(useResourceClaimTemplateNames);

const resourceClaims: PodSpec['resourceClaims'] = [
  { name: 'hwp-dra', resourceClaimTemplateName: 'single-gpu' },
];

const draResources: ContainerResources = {
  requests: { cpu: '1', memory: '2Gi' },
  limits: { cpu: '1', memory: '2Gi' },
  claims: [{ name: 'hwp-dra' }],
};

const draProfile = (namespace = 'opendatahub') =>
  mockHardwareProfile({
    name: 'dra-profile',
    namespace,
    resourceVersion: '2000',
    dra: { resourceClaimTemplateName: 'single-gpu' },
  });

const creatingData = (hardwareProfile: HardwareProfileConfig): CreatingInferenceServiceObject => ({
  project: 'test-project',
  name: 'Test Inference Service',
  k8sName: 'test-inference-service',
  description: '',
  hardwareProfile,
});

const draHardwareProfileConfig = (): HardwareProfileConfig => ({
  selectedProfile: draProfile(),
  useExistingSettings: false,
  resources: draResources,
});

describe('assembleInferenceService', () => {
  it('should keep the resource claims and the resource version when the same DRA hardware profile stays selected', () => {
    const existingInferenceService = mockInferenceServiceK8sResource({
      hardwareProfileName: 'dra-profile',
      hardwareProfileNamespace: 'opendatahub',
      hardwareProfileResourceVersion: '1000',
      resourceClaims,
      resources: draResources,
    });

    const result = assembleInferenceService(
      creatingData(draHardwareProfileConfig()),
      existingInferenceService,
    );

    expect(result.metadata.annotations).toMatchObject({
      'opendatahub.io/hardware-profile-name': 'dra-profile',
      'opendatahub.io/hardware-profile-namespace': 'opendatahub',
      'opendatahub.io/hardware-profile-resource-version': '1000',
    });
    expect(result.spec.predictor.resourceClaims).toStrictEqual(resourceClaims);
    expect(result.spec.predictor.model?.resources?.claims).toStrictEqual(draResources.claims);
  });

  it('should write the resource version and keep the resource claims when a DRA hardware profile is newly selected', () => {
    const existingInferenceService = mockInferenceServiceK8sResource({
      hardwareProfileName: 'small-profile',
      hardwareProfileNamespace: 'opendatahub',
      hardwareProfileResourceVersion: '1000',
      resourceClaims,
      resources: draResources,
    });

    const result = assembleInferenceService(
      creatingData(draHardwareProfileConfig()),
      existingInferenceService,
    );

    expect(result.metadata.annotations).toMatchObject({
      'opendatahub.io/hardware-profile-name': 'dra-profile',
      'opendatahub.io/hardware-profile-namespace': 'opendatahub',
      'opendatahub.io/hardware-profile-resource-version': '2000',
    });
    expect(result.spec.predictor.resourceClaims).toStrictEqual(resourceClaims);
    expect(result.spec.predictor.model?.resources).toStrictEqual(draResources);
  });

  it('should keep the resource version when a deployment bound by name only keeps its DRA hardware profile', () => {
    const existingInferenceService = mockInferenceServiceK8sResource({
      hardwareProfileName: 'dra-profile',
      hardwareProfileResourceVersion: '1000',
      resourceClaims,
      resources: draResources,
    });

    const result = assembleInferenceService(
      {
        ...creatingData({
          ...draHardwareProfileConfig(),
          selectedProfile: draProfile('test-project'),
        }),
        hardwareProfileBinding: { name: 'dra-profile', namespace: 'test-project' },
      },
      existingInferenceService,
    );

    expect(result.metadata.annotations).toMatchObject({
      'opendatahub.io/hardware-profile-name': 'dra-profile',
      'opendatahub.io/hardware-profile-namespace': 'test-project',
      'opendatahub.io/hardware-profile-resource-version': '1000',
    });
  });

  it('should keep the hardware profile annotations and resource claims of a deployment bound to a DRA hardware profile by name only when saved without changes', () => {
    const projectDRAProfile = draProfile('test-project');
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
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[projectDRAProfile], true, undefined],
      globalProfiles: [[], true, undefined],
    });
    mockUseResourceClaimTemplateNames.mockReturnValue({
      status: 'ready',
      names: new Set(['single-gpu']),
    });
    const existingInferenceService = mockInferenceServiceK8sResource({
      hardwareProfileName: 'dra-profile',
      hardwareProfileResourceVersion: '1000',
      resourceClaims,
      resources: draResources,
    });
    const [
      hardwareProfileName,
      resources,
      tolerations,
      nodeSelector,
      visibleIn,
      resourceNamespace,
      hardwareProfileNamespace,
    ] = extractHardwareProfileConfig({
      modelServingPlatformId: 'kserve',
      model: existingInferenceService,
    });

    const { formData, existingBinding } = testHook(useHardwareProfileConfig)(
      hardwareProfileName,
      resources,
      tolerations,
      nodeSelector,
      visibleIn,
      resourceNamespace,
      hardwareProfileNamespace,
      { allowDRAProfiles: true, project: 'test-project' },
    ).result.current;
    const result = assembleInferenceService(
      { ...creatingData(formData), hardwareProfileBinding: existingBinding },
      existingInferenceService,
    );

    expect(formData.selectedProfile).toBe(projectDRAProfile);
    expect(result.metadata.annotations).toMatchObject({
      'opendatahub.io/hardware-profile-name': 'dra-profile',
      'opendatahub.io/hardware-profile-namespace': 'test-project',
      'opendatahub.io/hardware-profile-resource-version': '1000',
    });
    expect(result.spec.predictor.resourceClaims).toStrictEqual(resourceClaims);
    expect(result.spec.predictor.model?.resources).toStrictEqual(draResources);
  });

  it('should write the resource version when a new deployment uses a DRA hardware profile', () => {
    const result = assembleInferenceService(creatingData(draHardwareProfileConfig()));

    expect(result.metadata.annotations).toMatchObject({
      'opendatahub.io/hardware-profile-name': 'dra-profile',
      'opendatahub.io/hardware-profile-namespace': 'opendatahub',
      'opendatahub.io/hardware-profile-resource-version': '2000',
    });
    expect(result.spec.predictor.model?.resources).toStrictEqual(draResources);
  });
});
