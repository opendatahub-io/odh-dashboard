import { testHook } from '@odh-dashboard/jest-config/hooks';
import type { ContainerResources, PodSpec } from '@odh-dashboard/k8s-core';
import { useDashboardNamespace } from '@odh-dashboard/plugin-core';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import type {
  HardwareProfileBinding,
  HardwareProfileConfig,
} from '@odh-dashboard/hardware-profiles/shared';
import { useHardwareProfileConfig } from '@odh-dashboard/hardware-profiles/shared/useHardwareProfileConfig';
import { useResourceClaimTemplateNames } from '@odh-dashboard/hardware-profiles/shared/useResourceClaimTemplateNames';
import { mockHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { useHardwareProfilesByFeatureVisibility } from '@odh-dashboard/hardware-profiles/pages/useHardwareProfilesByFeatureVisibility';
import {
  ModelLocationType,
  type WizardFormData,
} from '@odh-dashboard/model-serving/shared/types/form-data';
import { mockLLMInferenceServiceK8sResource } from '../../__mocks__/mockLLMInferenceServiceK8sResource';
import type { LLMdDeployment, LLMInferenceServiceKind } from '../../types';
import { assembleLLMdDeployment } from '../deploy';
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

const draHardwareProfileConfig = (namespace = 'opendatahub'): HardwareProfileConfig => ({
  selectedProfile: mockHardwareProfile({
    name: 'dra-profile',
    namespace,
    resourceVersion: '2000',
    dra: { resourceClaimTemplateName: 'single-gpu' },
  }),
  useExistingSettings: false,
  resources: draResources,
});

const wizardData = (
  hardwareProfile: HardwareProfileConfig,
  existingBinding?: HardwareProfileBinding,
) =>
  ({
    state: {
      project: { projectName: 'test-project' },
      k8sNameDesc: {
        data: {
          name: 'Test LLM Inference Service',
          description: '',
          k8sName: { value: 'test-llm-inference-service' },
        },
      },
      hardwareProfileConfig: { formData: hardwareProfile, existingBinding },
      modelLocationData: {
        data: { type: ModelLocationType.NEW, fieldValues: {}, additionalFields: {} },
      },
      createConnectionData: { data: {} },
      numReplicas: { data: 1 },
      runtimeArgs: { data: undefined },
      environmentVariables: { data: undefined },
      modelAvailability: { data: undefined },
      tokenAuthentication: { data: [] },
      modelServer: { data: undefined },
      deploymentMethod: undefined,
    },
  } as unknown as WizardFormData);

const existingDRADeployment = (annotations: Record<string, string>): LLMdDeployment => {
  const model: LLMInferenceServiceKind = mockLLMInferenceServiceK8sResource({
    additionalAnnotations: annotations,
    resourceClaims,
  });
  if (model.spec.template?.containers?.[0]) {
    model.spec.template.containers[0].resources = draResources;
  }
  return { modelServingPlatformId: 'llmd-serving', model };
};

describe('assembleLLMdDeployment', () => {
  it('should keep the resource claims and the resource version when the same DRA hardware profile stays selected', () => {
    const existingDeployment = existingDRADeployment({
      'opendatahub.io/hardware-profile-name': 'dra-profile',
      'opendatahub.io/hardware-profile-namespace': 'opendatahub',
      'opendatahub.io/hardware-profile-resource-version': '1000',
    });

    const { model } = assembleLLMdDeployment(
      wizardData(draHardwareProfileConfig()),
      existingDeployment,
    );

    expect(model.metadata.annotations).toMatchObject({
      'opendatahub.io/hardware-profile-name': 'dra-profile',
      'opendatahub.io/hardware-profile-namespace': 'opendatahub',
      'opendatahub.io/hardware-profile-resource-version': '1000',
    });
    expect(model.spec.template?.resourceClaims).toStrictEqual(resourceClaims);
    expect(model.spec.template?.containers?.[0].resources?.claims).toStrictEqual(
      draResources.claims,
    );
  });

  it('should write the resource version and keep the resource claims when a DRA hardware profile is newly selected', () => {
    const existingDeployment = existingDRADeployment({
      'opendatahub.io/hardware-profile-resource-version': '1000',
    });

    const { model } = assembleLLMdDeployment(
      wizardData(draHardwareProfileConfig()),
      existingDeployment,
    );

    expect(model.metadata.annotations).toMatchObject({
      'opendatahub.io/hardware-profile-name': 'dra-profile',
      'opendatahub.io/hardware-profile-namespace': 'opendatahub',
      'opendatahub.io/hardware-profile-resource-version': '2000',
    });
    expect(model.spec.template?.resourceClaims).toStrictEqual(resourceClaims);
    expect(model.spec.template?.containers?.[0].resources).toStrictEqual(draResources);
  });

  it('should keep the resource version when a deployment bound by name only keeps its DRA hardware profile', () => {
    const existingDeployment = existingDRADeployment({
      'opendatahub.io/hardware-profile-name': 'dra-profile',
      'opendatahub.io/hardware-profile-resource-version': '1000',
    });
    delete existingDeployment.model.metadata.annotations?.[
      'opendatahub.io/hardware-profile-namespace'
    ];

    const { model } = assembleLLMdDeployment(
      wizardData(draHardwareProfileConfig('test-project'), {
        name: 'dra-profile',
        namespace: 'test-project',
      }),
      existingDeployment,
    );

    expect(model.metadata.annotations).toMatchObject({
      'opendatahub.io/hardware-profile-name': 'dra-profile',
      'opendatahub.io/hardware-profile-namespace': 'test-project',
      'opendatahub.io/hardware-profile-resource-version': '1000',
    });
  });

  it('should keep the hardware profile annotations and resource claims of a deployment bound to a DRA hardware profile by name only when saved without changes', () => {
    const projectDRAProfile = mockHardwareProfile({
      name: 'dra-profile',
      namespace: 'test-project',
      dra: { resourceClaimTemplateName: 'single-gpu' },
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
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[projectDRAProfile], true, undefined],
      globalProfiles: [[], true, undefined],
    });
    mockUseResourceClaimTemplateNames.mockReturnValue({ status: 'unavailable' });
    const existingDeployment = existingDRADeployment({
      'opendatahub.io/hardware-profile-name': 'dra-profile',
      'opendatahub.io/hardware-profile-resource-version': '1000',
    });
    delete existingDeployment.model.metadata.annotations?.[
      'opendatahub.io/hardware-profile-namespace'
    ];
    const [
      hardwareProfileName,
      resources,
      tolerations,
      nodeSelector,
      visibleIn,
      resourceNamespace,
      hardwareProfileNamespace,
    ] = extractHardwareProfileConfig(existingDeployment).data;

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
    const { model } = assembleLLMdDeployment(
      wizardData(formData, existingBinding),
      existingDeployment,
    );

    expect(formData.selectedProfile).toBe(projectDRAProfile);
    expect(model.metadata.annotations).toMatchObject({
      'opendatahub.io/hardware-profile-name': 'dra-profile',
      'opendatahub.io/hardware-profile-namespace': 'test-project',
      'opendatahub.io/hardware-profile-resource-version': '1000',
    });
    expect(model.spec.template?.resourceClaims).toStrictEqual(resourceClaims);
    expect(model.spec.template?.containers?.[0].resources).toStrictEqual(draResources);
  });

  it('should write the resource version when a new deployment uses a DRA hardware profile', () => {
    const { model } = assembleLLMdDeployment(wizardData(draHardwareProfileConfig()));

    expect(model.metadata.annotations).toMatchObject({
      'opendatahub.io/hardware-profile-name': 'dra-profile',
      'opendatahub.io/hardware-profile-namespace': 'opendatahub',
      'opendatahub.io/hardware-profile-resource-version': '2000',
    });
    expect(model.spec.template?.containers?.[0].resources).toStrictEqual(draResources);
  });
});
