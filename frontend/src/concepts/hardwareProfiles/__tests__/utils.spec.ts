import {
  IdentifierResourceType,
  type HardwareProfileKind,
  type Identifier,
  type ContainerResources,
  type Toleration,
  type NodeSelector,
  type PodSpec,
} from '@odh-dashboard/k8s-core';
import { mockHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import {
  filterHardwareProfilesByDRAAvailability,
  getExistingPodSpec,
  isSameHardwareProfileBinding,
} from '@odh-dashboard/hardware-profiles/shared/utils';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import { mockNotebookK8sResource } from '#~/__mocks__';
import {
  getProfileScore,
  sortIdentifiers,
  getExistingResources,
  getExistingHardwareProfileData,
  assemblePodSpecOptions,
  applyHardwareProfileConfig,
  formatIdentifierDetails,
  formatResource,
  getLocalQueueLabel,
  isDRAHardwareProfile,
  getDRAHardwareProfileDetails,
} from '#~/concepts/hardwareProfiles/utils';
import { UseHardwareProfileConfigResult } from '#~/concepts/hardwareProfiles/useHardwareProfileConfig';
import { NOTEBOOK_HARDWARE_PROFILE_PATHS } from '#~/concepts/notebooks/const.ts';
import { INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS } from '#~/concepts/hardwareProfiles/const';

global.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));

describe('formatResource', () => {
  it('should format with Default and Max labels separated by comma', () => {
    expect(formatResource('CPU', '2 Cores', '8 Cores')).toBe(
      'CPU: Default = 2 Cores, Max = 8 Cores',
    );
  });

  it('should handle unrestricted max', () => {
    expect(formatResource('Memory', '4 GiB', 'unrestricted')).toBe(
      'Memory: Default = 4 GiB, Max = unrestricted',
    );
  });
});

describe('formatIdentifierDetails', () => {
  it('should format CPU identifier with default, min, and max', () => {
    const identifier: Identifier = {
      displayName: 'CPU',
      identifier: 'cpu',
      minCount: '1',
      maxCount: '8',
      defaultCount: '2',
      resourceType: IdentifierResourceType.CPU,
    };
    expect(formatIdentifierDetails(identifier)).toBe(
      'Default = 2 Cores, Min = 1 Cores, Max = 8 Cores',
    );
  });

  it('should format memory identifier with proper units', () => {
    const identifier: Identifier = {
      displayName: 'Memory',
      identifier: 'memory',
      minCount: '2Gi',
      maxCount: '16Gi',
      defaultCount: '4Gi',
      resourceType: IdentifierResourceType.MEMORY,
    };
    expect(formatIdentifierDetails(identifier)).toBe('Default = 4 GiB, Min = 2 GiB, Max = 16 GiB');
  });

  it('should show "unrestricted" when maxCount is undefined', () => {
    const identifier: Identifier = {
      displayName: 'Memory',
      identifier: 'memory',
      minCount: '2Gi',
      defaultCount: '4Gi',
      resourceType: IdentifierResourceType.MEMORY,
    };
    expect(formatIdentifierDetails(identifier)).toBe(
      'Default = 4 GiB, Min = 2 GiB, Max = unrestricted',
    );
  });

  it('should format accelerator identifier with numeric values', () => {
    const identifier: Identifier = {
      displayName: 'NVIDIA GPU',
      identifier: 'nvidia.com/gpu',
      minCount: 0,
      maxCount: 4,
      defaultCount: 1,
      resourceType: IdentifierResourceType.ACCELERATOR,
    };
    expect(formatIdentifierDetails(identifier)).toBe('Default = 1, Min = 0, Max = 4');
  });
});

describe('sortIdentifiers', () => {
  it('should sort CPU and memory first, followed by other identifiers', () => {
    const identifiers: Identifier[] = [
      {
        identifier: 'storage',
        displayName: 'Storage',
        minCount: 1,
        maxCount: 4,
        defaultCount: 1,
      },
      {
        identifier: 'memory',
        displayName: 'Memory',
        minCount: 1,
        maxCount: 1,
        defaultCount: 1,
      },
      {
        identifier: 'cpu',
        displayName: 'CPU',
        minCount: 1,
        maxCount: 1,
        defaultCount: 1,
      },
      {
        identifier: 'gpu',
        displayName: 'GPU',
        minCount: 0,
        maxCount: 4,
        defaultCount: 0,
      },
    ];

    const result = sortIdentifiers(identifiers);

    expect(result).toEqual([
      {
        identifier: 'cpu',
        displayName: 'CPU',
        minCount: 1,
        maxCount: 1,
        defaultCount: 1,
      },
      {
        identifier: 'memory',
        displayName: 'Memory',
        minCount: 1,
        maxCount: 1,
        defaultCount: 1,
      },
      {
        identifier: 'storage',
        displayName: 'Storage',
        minCount: 1,
        maxCount: 4,
        defaultCount: 1,
      },
      {
        identifier: 'gpu',
        displayName: 'GPU',
        minCount: 0,
        maxCount: 4,
        defaultCount: 0,
      },
    ]);
  });

  it('should handle empty array', () => {
    const identifiers: Identifier[] = [];
    const result = sortIdentifiers(identifiers);
    expect(result).toEqual([]);
  });
});

describe('getProfileScore', () => {
  it('should return 0, if no identifier exist', () => {
    const profile: HardwareProfileKind = mockHardwareProfile({});
    delete profile.spec.identifiers;
    const result = getProfileScore(profile);
    expect(result).toEqual(0);
  });

  it('should return Number.MAX_SAFE_INTEGER, when profile with no maxValue', () => {
    const profile: HardwareProfileKind = mockHardwareProfile({
      identifiers: [
        {
          displayName: 'Memory',
          identifier: 'memory',
          minCount: '2Gi',
          defaultCount: '2Gi',
          resourceType: IdentifierResourceType.MEMORY,
        },
        {
          displayName: 'CPU',
          identifier: 'cpu',
          minCount: '1',
          maxCount: '2',
          defaultCount: '1',
          resourceType: IdentifierResourceType.CPU,
        },
      ],
    });

    const result = getProfileScore(profile);
    expect(result).toEqual(Number.MAX_SAFE_INTEGER);
  });

  it('should return NaN, if maxCount is not number', () => {
    const profile: HardwareProfileKind = mockHardwareProfile({
      identifiers: [
        {
          identifier: 'memory',
          displayName: 'Memory',
          minCount: 1,
          maxCount: 'test',
          defaultCount: 1,
        },
      ],
    });
    const result = getProfileScore(profile);
    expect(result).toEqual(NaN);
  });

  it('convert CPU to smallest unit for comparison, when resourceType has just CPU', () => {
    const profile: HardwareProfileKind = mockHardwareProfile({
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          minCount: '1',
          maxCount: '2',
          defaultCount: '1',
          resourceType: IdentifierResourceType.CPU,
        },
      ],
    });
    const result = getProfileScore(profile);
    expect(result).toEqual(2000);
  });

  it('convert memory to smallest unit for comparison, when resourceType has just memory', () => {
    const profile: HardwareProfileKind = mockHardwareProfile({
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          minCount: '1',
          maxCount: '2',
          defaultCount: '1',
          resourceType: IdentifierResourceType.CPU,
        },
      ],
    });
    const result = getProfileScore(profile);
    expect(result).toEqual(2000);
  });

  it('convert memory & CPU to smallest unit for comparison, when identifier has both memory and CPU', () => {
    const profile: HardwareProfileKind = mockHardwareProfile({});
    const result = getProfileScore(profile);
    expect(result).toEqual(5368711120);
  });

  it('calculate score, when identifier has other resourceType than memory and CPU', () => {
    const profile: HardwareProfileKind = mockHardwareProfile({
      identifiers: [
        {
          identifier: 'storage',
          displayName: 'Storage',
          minCount: 1,
          maxCount: 4,
          defaultCount: 1,
        },
        {
          identifier: 'gpu',
          displayName: 'GPU',
          minCount: 0,
          maxCount: 4,
          defaultCount: 0,
        },
      ],
    });
    const result = getProfileScore(profile);
    expect(result).toEqual(8);
  });
});

describe('getExistingResources', () => {
  const paths = NOTEBOOK_HARDWARE_PROFILE_PATHS;

  it('should extract resources from notebook', () => {
    const notebook = mockNotebookK8sResource({
      resources: {
        requests: { cpu: '2', memory: '8Gi' },
        limits: { cpu: '4', memory: '16Gi' },
      },
    });

    const result = getExistingResources(notebook, paths);

    expect(result.existingContainerResources).toEqual({
      requests: { cpu: '2', memory: '8Gi' },
      limits: { cpu: '4', memory: '16Gi' },
    });
  });

  it('should extract tolerations from notebook', () => {
    const tolerations: Toleration[] = [{ key: 'gpu-key', value: 'gpu-value' }, { key: 'node-key' }];

    const notebook = mockNotebookK8sResource({
      opts: {
        spec: {
          template: {
            spec: {
              tolerations,
            },
          },
        },
      },
    });

    const result = getExistingResources(notebook, paths);

    // Use toMatchObject to allow for additional default fields from mock
    expect(result.existingTolerations).toMatchObject(tolerations);
    expect(result.existingTolerations).toBeDefined();
    expect(result.existingTolerations?.length).toBe(2);
  });

  it('should extract nodeSelector from notebook', () => {
    const nodeSelector: NodeSelector = {
      'node-type': 'gpu',
      zone: 'us-east-1a',
    };

    const notebook = mockNotebookK8sResource({
      opts: {
        spec: {
          template: {
            spec: {
              nodeSelector,
            },
          },
        },
      },
    });

    const result = getExistingResources(notebook, paths);

    expect(result.existingNodeSelector).toEqual(nodeSelector);
  });

  it('should handle null resource', () => {
    const result = getExistingResources(null, paths);

    expect(result.existingContainerResources).toBeUndefined();
    expect(result.existingTolerations).toBeUndefined();
    expect(result.existingNodeSelector).toBeUndefined();
  });

  it('should handle resource without explicitly set hardware profile fields', () => {
    const notebook = mockNotebookK8sResource({});

    const result = getExistingResources(notebook, paths);

    expect(result.existingContainerResources).toBeDefined();
    // Note: mockNotebookK8sResource may have default tolerations/nodeSelector
    // Just verify we got something back (even if it's defaults)
    expect(result).toHaveProperty('existingTolerations');
    expect(result).toHaveProperty('existingNodeSelector');
  });
});

describe('getExistingPodSpec', () => {
  const resourceClaims = [{ name: 'hwp-dra', resourceClaimTemplateName: 'single-gpu' }];

  it('should return the pod spec at the configured path', () => {
    const inferenceService = mockInferenceServiceK8sResource({ resourceClaims });
    const podSpec = getExistingPodSpec(inferenceService, INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS);

    expect(podSpec).toBe(inferenceService.spec.predictor);
    expect(podSpec?.resourceClaims).toStrictEqual(resourceClaims);
  });

  it('should return undefined when the paths have no pod spec path', () => {
    expect(
      getExistingPodSpec(mockNotebookK8sResource({}), NOTEBOOK_HARDWARE_PROFILE_PATHS),
    ).toBeUndefined();
  });

  it('should return undefined when the pod spec path does not exist on the resource', () => {
    expect(
      getExistingPodSpec(mockNotebookK8sResource({}), {
        ...NOTEBOOK_HARDWARE_PROFILE_PATHS,
        podSpecPath: 'spec.predictor',
      }),
    ).toBeUndefined();
  });

  it('should return undefined without paths', () => {
    expect(getExistingPodSpec(mockInferenceServiceK8sResource({ resourceClaims }))).toBeUndefined();
  });

  it('should return undefined for a null resource', () => {
    expect(getExistingPodSpec(null, INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS)).toBeUndefined();
  });
});

describe('getExistingHardwareProfileData', () => {
  it('should extract hardware profile name and namespace from annotations', () => {
    const notebook = mockNotebookK8sResource({
      opts: {
        metadata: {
          annotations: {
            'opendatahub.io/hardware-profile-name': 'test-profile',
            'opendatahub.io/hardware-profile-namespace': 'test-namespace',
          },
        },
      },
    });

    const result = getExistingHardwareProfileData(notebook);

    expect(result).toEqual({
      name: 'test-profile',
      namespace: 'test-namespace',
    });
  });

  it('should return undefined values for resource without hardware profile annotations', () => {
    const notebook = mockNotebookK8sResource({});

    const result = getExistingHardwareProfileData(notebook);

    // mockNotebookK8sResource may return empty string instead of undefined
    expect(result.name).toBeFalsy();
    expect(result.namespace).toBeFalsy();
  });

  it('should handle null resource', () => {
    const result = getExistingHardwareProfileData(null);

    expect(result).toEqual({
      name: undefined,
      namespace: undefined,
    });
  });

  it('should extract only name when namespace annotation is missing', () => {
    const notebook = mockNotebookK8sResource({
      opts: {
        metadata: {
          annotations: {
            'opendatahub.io/hardware-profile-name': 'test-profile',
          },
        },
      },
    });

    const result = getExistingHardwareProfileData(notebook);

    expect(result.name).toBe('test-profile');
    // mockNotebookK8sResource may return null or empty string instead of undefined
    expect(result.namespace).toBeFalsy();
  });

  it('should resolve a missing namespace annotation to the given workload namespace', () => {
    const notebook = mockNotebookK8sResource({ hardwareProfileName: 'test-profile' });

    expect(getExistingHardwareProfileData(notebook, 'test-project')).toEqual({
      name: 'test-profile',
      namespace: 'test-project',
    });
  });

  it('should keep the namespace annotation over the given workload namespace', () => {
    const notebook = mockNotebookK8sResource({
      hardwareProfileName: 'test-profile',
      hardwareProfileNamespace: 'test-namespace',
    });

    expect(getExistingHardwareProfileData(notebook, 'test-project')).toEqual({
      name: 'test-profile',
      namespace: 'test-namespace',
    });
  });
});

describe('assemblePodSpecOptions', () => {
  it('should assemble pod spec options with hardware profile', () => {
    const hardwareProfile = mockHardwareProfile({
      name: 'test-profile',
      tolerations: [{ key: 'test-key', value: 'test-value' }],
      nodeSelector: { 'test-label': 'test-value' },
    });

    const hardwareProfileConfig: UseHardwareProfileConfigResult = {
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
    };

    const result = assemblePodSpecOptions(hardwareProfileConfig);

    expect(result).toEqual({
      selectedHardwareProfile: hardwareProfile,
      resources: {
        requests: { cpu: '2', memory: '8Gi' },
        limits: { cpu: '2', memory: '8Gi' },
      },
      tolerations: hardwareProfile.spec.scheduling?.node?.tolerations,
      nodeSelector: hardwareProfile.spec.scheduling?.node?.nodeSelector,
    });
  });

  it('should use existing resources when useExistingSettings is true', () => {
    const existingResources: ContainerResources = {
      requests: { cpu: '4', memory: '16Gi' },
      limits: { cpu: '8', memory: '32Gi' },
    };

    const existingTolerations: Toleration[] = [{ key: 'existing-key' }];
    const existingNodeSelector: NodeSelector = { 'existing-label': 'existing-value' };

    const hardwareProfileConfig: UseHardwareProfileConfigResult = {
      formData: {
        selectedProfile: undefined,
        useExistingSettings: true,
        resources: {
          requests: { cpu: '1', memory: '2Gi' },
          limits: { cpu: '1', memory: '2Gi' },
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
    };

    const result = assemblePodSpecOptions(hardwareProfileConfig, {
      existingContainerResources: existingResources,
      existingTolerations,
      existingNodeSelector,
    });

    expect(result).toEqual({
      selectedHardwareProfile: undefined,
      resources: existingResources,
      tolerations: existingTolerations,
      nodeSelector: existingNodeSelector,
    });
  });

  it('should handle no hardware profile selected', () => {
    const hardwareProfileConfig: UseHardwareProfileConfigResult = {
      formData: {
        selectedProfile: undefined,
        useExistingSettings: false,
        resources: undefined,
      },
      initialHardwareProfile: undefined,
      excludeDRAProfiles: false,
      existingBinding: {},
      isFormDataValid: false,
      setFormData: jest.fn(),
      resetFormData: jest.fn(),
      profilesLoaded: true,
      profilesLoadError: undefined,
    };

    const result = assemblePodSpecOptions(hardwareProfileConfig);

    expect(result).toEqual({
      selectedHardwareProfile: undefined,
      resources: undefined,
      tolerations: undefined,
      nodeSelector: undefined,
    });
  });
});

describe('applyHardwareProfileConfig', () => {
  const paths = NOTEBOOK_HARDWARE_PROFILE_PATHS;

  it('should apply hardware profile annotations to notebook', () => {
    const hardwareProfile = mockHardwareProfile({
      name: 'test-profile',
      namespace: 'test-namespace',
      resourceVersion: '12345',
    });

    const notebook = mockNotebookK8sResource({});
    const config = {
      selectedProfile: hardwareProfile,
      useExistingSettings: false,
      resources: {
        requests: { cpu: '2', memory: '8Gi' },
        limits: { cpu: '2', memory: '8Gi' },
      },
    };

    const result = applyHardwareProfileConfig(notebook, config, paths);

    expect(result.metadata.annotations?.['opendatahub.io/hardware-profile-name']).toBe(
      'test-profile',
    );
    expect(result.metadata.annotations?.['opendatahub.io/hardware-profile-namespace']).toBe(
      'test-namespace',
    );
    expect(result.metadata.annotations?.['opendatahub.io/hardware-profile-resource-version']).toBe(
      '12345',
    );
  });

  it('should apply resources to notebook at configured path', () => {
    const hardwareProfile = mockHardwareProfile({});
    const notebook = mockNotebookK8sResource({});

    const resources: ContainerResources = {
      requests: { cpu: '4', memory: '16Gi', 'nvidia.com/gpu': '1' },
      limits: { cpu: '4', memory: '16Gi', 'nvidia.com/gpu': '1' },
    };

    const config = {
      selectedProfile: hardwareProfile,
      useExistingSettings: false,
      resources,
    };

    const result = applyHardwareProfileConfig(notebook, config, paths);

    expect(result.spec.template.spec.containers[0].resources).toEqual(resources);
  });

  it('should not mutate original resource', () => {
    const hardwareProfile = mockHardwareProfile({ name: 'immutable-test' });
    const notebook = mockNotebookK8sResource({});
    const originalName = notebook.metadata.name;
    const originalAnnotations = { ...notebook.metadata.annotations };

    const config = {
      selectedProfile: hardwareProfile,
      useExistingSettings: false,
      resources: {
        requests: { cpu: '2', memory: '8Gi' },
        limits: { cpu: '2', memory: '8Gi' },
      },
    };

    const result = applyHardwareProfileConfig(notebook, config, paths);

    // Original notebook should be unchanged
    expect(notebook.metadata.annotations?.['opendatahub.io/hardware-profile-name']).toBe(
      originalAnnotations['opendatahub.io/hardware-profile-name'],
    );

    // Result should be a different object
    expect(result).not.toBe(notebook);
    expect(result.metadata.name).toBe(originalName);
    expect(result.metadata.annotations?.['opendatahub.io/hardware-profile-name']).toBe(
      'immutable-test',
    );
  });

  it('should remove hardware profile annotations when no profile is selected', () => {
    const notebook = mockNotebookK8sResource({
      opts: {
        metadata: {
          annotations: {
            'opendatahub.io/hardware-profile-name': 'old-profile',
            'opendatahub.io/hardware-profile-namespace': 'old-namespace',
            'opendatahub.io/hardware-profile-resource-version': '99999',
          },
        },
      },
    });

    const config = {
      selectedProfile: undefined,
      useExistingSettings: false,
      resources: undefined,
    };

    const result = applyHardwareProfileConfig(notebook, config, paths);

    expect(result.metadata.annotations?.['opendatahub.io/hardware-profile-name']).toBeUndefined();
    expect(
      result.metadata.annotations?.['opendatahub.io/hardware-profile-namespace'],
    ).toBeUndefined();
    expect(
      result.metadata.annotations?.['opendatahub.io/hardware-profile-resource-version'],
    ).toBeUndefined();
  });

  it('should not apply resources when useExistingSettings is true', () => {
    const hardwareProfile = mockHardwareProfile({ name: 'test-profile' });
    const notebook = mockNotebookK8sResource({
      resources: {
        requests: { cpu: '1', memory: '2Gi' },
        limits: { cpu: '1', memory: '2Gi' },
      },
    });

    const config = {
      selectedProfile: hardwareProfile,
      useExistingSettings: true,
      resources: {
        requests: { cpu: '10', memory: '20Gi' },
        limits: { cpu: '10', memory: '20Gi' },
      },
    };

    const result = applyHardwareProfileConfig(notebook, config, paths);

    // Should still have annotations
    expect(result.metadata.annotations?.['opendatahub.io/hardware-profile-name']).toBe(
      'test-profile',
    );

    // But resources should remain unchanged (existing settings)
    expect(result.spec.template.spec.containers[0].resources).toEqual({
      requests: { cpu: '1', memory: '2Gi' },
      limits: { cpu: '1', memory: '2Gi' },
    });
  });

  it('should handle resource with minimal metadata', () => {
    const hardwareProfile = mockHardwareProfile({ name: 'test-profile' });
    const minimalNotebook = mockNotebookK8sResource({});
    // Clear all annotations
    if (minimalNotebook.metadata.annotations) {
      minimalNotebook.metadata.annotations = {};
    }

    const config = {
      selectedProfile: hardwareProfile,
      useExistingSettings: false,
      resources: {
        requests: { cpu: '2', memory: '8Gi' },
        limits: { cpu: '2', memory: '8Gi' },
      },
    };

    const result = applyHardwareProfileConfig(minimalNotebook, config, paths);

    // Should have metadata and annotations
    expect(result.metadata).toBeDefined();
    expect(result.metadata.annotations?.['opendatahub.io/hardware-profile-name']).toBe(
      'test-profile',
    );
  });

  it('should work with different path configurations', () => {
    const hardwareProfile = mockHardwareProfile({ name: 'custom-path-test' });

    // Create a mock inference service structure
    const inferenceService = {
      apiVersion: 'serving.kserve.io/v1beta1',
      kind: 'InferenceService',
      metadata: { name: 'test-inference', namespace: 'test-ns' },
      spec: {
        predictor: {
          model: {
            resources: {
              requests: { cpu: '1', memory: '2Gi' },
              limits: { cpu: '1', memory: '2Gi' },
            },
          },
        },
      },
    };

    const inferenceServicePaths = {
      containerResourcesPath: 'spec.predictor.model.resources',
      tolerationsPath: 'spec.predictor.tolerations',
      nodeSelectorPath: 'spec.predictor.nodeSelector',
    };

    const config = {
      selectedProfile: hardwareProfile,
      useExistingSettings: false,
      resources: {
        requests: { cpu: '4', memory: '16Gi' },
        limits: { cpu: '4', memory: '16Gi' },
      },
    };

    const result = applyHardwareProfileConfig(inferenceService, config, inferenceServicePaths);

    // Verify resources applied at correct path
    expect(result.spec.predictor.model.resources).toEqual({
      requests: { cpu: '4', memory: '16Gi' },
      limits: { cpu: '4', memory: '16Gi' },
    });

    // Verify annotations still work (metadata should exist)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).metadata?.annotations?.['opendatahub.io/hardware-profile-name']).toBe(
      'custom-path-test',
    );
  });

  it('should keep the resource version and the claims when saving a workload with its assigned DRA hardware profile', () => {
    const hardwareProfile = mockHardwareProfile({
      name: 'dra-profile',
      namespace: 'opendatahub',
      resourceVersion: '12345',
      identifiers: [],
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });
    const notebook = mockNotebookK8sResource({
      hardwareProfileName: 'dra-profile',
      hardwareProfileNamespace: 'opendatahub',
      opts: {
        metadata: { annotations: { 'opendatahub.io/hardware-profile-resource-version': '1' } },
      },
    });
    const existingResources = {
      requests: { cpu: '1', memory: '2Gi' },
      limits: { cpu: '1', memory: '2Gi' },
      claims: [{ name: 'hwp-dra' }],
    };
    const config = {
      selectedProfile: hardwareProfile,
      useExistingSettings: false,
      resources: existingResources,
    };

    const result = applyHardwareProfileConfig(notebook, config, paths);

    expect(result.metadata.annotations?.['opendatahub.io/hardware-profile-name']).toBe(
      'dra-profile',
    );
    expect(result.metadata.annotations?.['opendatahub.io/hardware-profile-namespace']).toBe(
      'opendatahub',
    );
    expect(result.metadata.annotations?.['opendatahub.io/hardware-profile-resource-version']).toBe(
      '1',
    );
    expect(result.spec.template.spec.containers[0].resources).toEqual(existingResources);
  });

  it('should write the resource version when a DRA hardware profile is newly selected', () => {
    const hardwareProfile = mockHardwareProfile({
      name: 'dra-profile',
      namespace: 'opendatahub',
      resourceVersion: '12345',
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });
    const notebook = mockNotebookK8sResource({
      hardwareProfileName: 'regular-profile',
      hardwareProfileNamespace: 'opendatahub',
      opts: {
        metadata: { annotations: { 'opendatahub.io/hardware-profile-resource-version': '1' } },
      },
    });

    const result = applyHardwareProfileConfig(
      notebook,
      { selectedProfile: hardwareProfile, useExistingSettings: false },
      paths,
    );

    expect(result.metadata.annotations?.['opendatahub.io/hardware-profile-name']).toBe(
      'dra-profile',
    );
    expect(result.metadata.annotations?.['opendatahub.io/hardware-profile-resource-version']).toBe(
      '12345',
    );
  });

  it('should use the given existing binding to decide whether a DRA hardware profile is newly selected', () => {
    const hardwareProfile = mockHardwareProfile({
      name: 'dra-profile',
      namespace: 'opendatahub',
      resourceVersion: '12345',
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });
    const config = { selectedProfile: hardwareProfile, useExistingSettings: false };

    const sameBinding = applyHardwareProfileConfig(mockNotebookK8sResource({}), config, paths, {
      name: 'dra-profile',
      namespace: 'opendatahub',
    });
    const newBinding = applyHardwareProfileConfig(mockNotebookK8sResource({}), config, paths, {
      name: 'regular-profile',
      namespace: 'opendatahub',
    });

    expect(
      sameBinding.metadata.annotations?.['opendatahub.io/hardware-profile-resource-version'],
    ).toBeUndefined();
    expect(
      newBinding.metadata.annotations?.['opendatahub.io/hardware-profile-resource-version'],
    ).toBe('12345');
  });

  it('should keep the resource version when a workload bound by name only is saved with its DRA hardware profile', () => {
    const hardwareProfile = mockHardwareProfile({
      name: 'dra-profile',
      namespace: 'test-project',
      resourceVersion: '12345',
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });
    const notebook = mockNotebookK8sResource({
      hardwareProfileName: 'dra-profile',
      opts: {
        metadata: { annotations: { 'opendatahub.io/hardware-profile-resource-version': '1' } },
      },
    });

    const result = applyHardwareProfileConfig(
      notebook,
      { selectedProfile: hardwareProfile, useExistingSettings: false },
      paths,
    );

    expect(result.metadata.annotations?.['opendatahub.io/hardware-profile-namespace']).toBe(
      'test-project',
    );
    expect(result.metadata.annotations?.['opendatahub.io/hardware-profile-resource-version']).toBe(
      '1',
    );
  });

  it('should write back all the existing resources of a workload whose DRA hardware profile is locked', () => {
    const hardwareProfile = mockHardwareProfile({
      name: 'dra-profile',
      namespace: 'opendatahub',
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });
    const existingResources = {
      requests: { cpu: '8', memory: '16Gi', 'nvidia.com/gpu': '1' },
      limits: { cpu: '8', memory: '16Gi', 'nvidia.com/gpu': '1' },
    };

    const result = applyHardwareProfileConfig(
      mockNotebookK8sResource({}),
      { selectedProfile: hardwareProfile, useExistingSettings: true, resources: existingResources },
      paths,
    );

    expect(result.spec.template.spec.containers[0].resources).toEqual(existingResources);
    expect(result.metadata.annotations?.['opendatahub.io/hardware-profile-name']).toBe(
      'dra-profile',
    );
  });

  it('should not create the container resources path for a DRA hardware profile when the workload has no resources', () => {
    const hardwareProfile = mockHardwareProfile({
      name: 'dra-profile',
      identifiers: [],
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });
    const annotations: Record<string, string> = {};
    const resource = {
      apiVersion: 'serving.kserve.io/v1alpha1',
      kind: 'LLMInferenceService',
      metadata: { name: 'llm', namespace: 'test-ns', annotations },
      spec: { template: {} },
    };
    // The form fills in empty requests and limits when the workload has none.
    const config = {
      selectedProfile: hardwareProfile,
      useExistingSettings: true,
      resources: { requests: {}, limits: {} },
    };

    const result = applyHardwareProfileConfig(resource, config, {
      containerResourcesPath: 'spec.template.containers.0.resources',
      tolerationsPath: 'spec.template.tolerations',
      nodeSelectorPath: 'spec.template.nodeSelector',
    });

    expect(result.spec).toEqual({ template: {} });
    expect(result.metadata.annotations['opendatahub.io/hardware-profile-name']).toBe('dra-profile');
  });
});

describe('getLocalQueueLabel', () => {
  it('returns "Local queue"', () => {
    expect(getLocalQueueLabel()).toBe('Local queue');
  });
});

describe('isDRAHardwareProfile', () => {
  it('should return true when the profile references a ResourceClaimTemplate', () => {
    expect(
      isDRAHardwareProfile(
        mockHardwareProfile({ dra: { resourceClaimTemplateName: 'single-gpu' } }),
      ),
    ).toBe(true);
  });

  it('should return false when the profile has no dra field', () => {
    expect(isDRAHardwareProfile(mockHardwareProfile({}))).toBe(false);
  });
});

describe('filterHardwareProfilesByDRAAvailability', () => {
  const regularProfile = mockHardwareProfile({ name: 'regular-profile' });
  const draProfile = mockHardwareProfile({
    name: 'dra-profile',
    dra: { resourceClaimTemplateName: 'single-gpu' },
  });

  it('should keep every profile when DRA hardware profiles are enabled', () => {
    const profiles = [regularProfile, draProfile];

    expect(filterHardwareProfilesByDRAAvailability(profiles, true)).toBe(profiles);
  });

  it('should drop DRA profiles when DRA hardware profiles are disabled', () => {
    expect(filterHardwareProfilesByDRAAvailability([regularProfile, draProfile], false)).toEqual([
      regularProfile,
    ]);
  });

  it('should return an empty list when only DRA profiles exist and DRA hardware profiles are disabled', () => {
    expect(filterHardwareProfilesByDRAAvailability([draProfile], false)).toEqual([]);
  });

  it('should return an empty list for an empty input', () => {
    expect(filterHardwareProfilesByDRAAvailability([], false)).toEqual([]);
    expect(filterHardwareProfilesByDRAAvailability([], true)).toEqual([]);
  });
});

describe('getDRAHardwareProfileDetails', () => {
  const dra = { resourceClaimTemplateName: 'single-mig-partition' };

  it('should return undefined for a non-DRA hardware profile', () => {
    expect(getDRAHardwareProfileDetails(mockHardwareProfile({}))).toBeUndefined();
  });

  it('should return the template name and description', () => {
    const profile = mockHardwareProfile({
      dra,
      annotations: {
        'opendatahub.io/resource-claim-description':
          'Requests one partitioned GPU device for the workload.',
      },
    });

    expect(getDRAHardwareProfileDetails(profile)).toStrictEqual({
      resourceClaimTemplateName: 'single-mig-partition',
      description: 'Requests one partitioned GPU device for the workload.',
    });
  });

  it('should omit the description when the annotation is missing', () => {
    expect(getDRAHardwareProfileDetails(mockHardwareProfile({ dra }))).toStrictEqual({
      resourceClaimTemplateName: 'single-mig-partition',
    });
  });

  it.each(['', '   ', ' \n\t '])(
    'should omit the description when the annotation is %j',
    (value) => {
      const profile = mockHardwareProfile({
        dra,
        annotations: { 'opendatahub.io/resource-claim-description': value },
      });

      expect(getDRAHardwareProfileDetails(profile)).toStrictEqual({
        resourceClaimTemplateName: 'single-mig-partition',
      });
    },
  );

  describe('with the workload pod spec', () => {
    const description = 'Requests one partitioned GPU device for the workload.';
    const podSpec = (resourceClaims: PodSpec['resourceClaims']): PodSpec => ({
      containers: [],
      resourceClaims,
    });

    it("should return the workload's template and no description when it differs from the profile", () => {
      const profile = mockHardwareProfile({
        dra,
        annotations: { 'opendatahub.io/resource-claim-description': description },
      });

      expect(
        getDRAHardwareProfileDetails(
          profile,
          podSpec([{ name: 'hwp-dra', resourceClaimTemplateName: 'single-gpu' }]),
        ),
      ).toStrictEqual({ resourceClaimTemplateName: 'single-gpu' });
    });

    it('should keep the description when the workload uses the profile template', () => {
      const profile = mockHardwareProfile({
        dra,
        annotations: { 'opendatahub.io/resource-claim-description': description },
      });

      expect(
        getDRAHardwareProfileDetails(
          profile,
          podSpec([{ name: 'hwp-dra', resourceClaimTemplateName: 'single-mig-partition' }]),
        ),
      ).toStrictEqual({ resourceClaimTemplateName: 'single-mig-partition', description });
    });

    it('should return the workload template when the profile no longer uses DRA', () => {
      expect(
        getDRAHardwareProfileDetails(
          mockHardwareProfile({}),
          podSpec([{ name: 'hwp-dra', resourceClaimTemplateName: 'single-gpu' }]),
        ),
      ).toStrictEqual({ resourceClaimTemplateName: 'single-gpu' });
    });

    it('should ignore claims the webhook did not add', () => {
      expect(
        getDRAHardwareProfileDetails(
          mockHardwareProfile({ dra }),
          podSpec([{ name: 'user-claim', resourceClaimTemplateName: 'other-template' }]),
        ),
      ).toStrictEqual({ resourceClaimTemplateName: 'single-mig-partition' });
    });

    it('should fall back to the profile template when the workload has no claims', () => {
      expect(
        getDRAHardwareProfileDetails(mockHardwareProfile({ dra }), podSpec(undefined)),
      ).toStrictEqual({
        resourceClaimTemplateName: 'single-mig-partition',
      });
    });
  });

  it('should collapse line breaks and repeated whitespace into single spaces', () => {
    const profile = mockHardwareProfile({
      dra,
      annotations: {
        'opendatahub.io/resource-claim-description': '\n  Line one\n\nLine\ttwo  \n',
      },
    });

    expect(getDRAHardwareProfileDetails(profile)?.description).toBe('Line one Line two');
  });
});

describe('isSameHardwareProfileBinding', () => {
  it('should return true when the name and namespace match', () => {
    expect(
      isSameHardwareProfileBinding(
        { name: 'dra-profile', namespace: 'opendatahub' },
        { name: 'dra-profile', namespace: 'opendatahub' },
      ),
    ).toBe(true);
  });

  it('should return false when the names differ', () => {
    expect(
      isSameHardwareProfileBinding(
        { name: 'dra-profile', namespace: 'opendatahub' },
        { name: 'other-profile', namespace: 'opendatahub' },
      ),
    ).toBe(false);
  });

  it('should return false when the namespaces differ', () => {
    expect(
      isSameHardwareProfileBinding(
        { name: 'dra-profile', namespace: 'opendatahub' },
        { name: 'dra-profile', namespace: 'test-project' },
      ),
    ).toBe(false);
  });

  it('should return false when only one binding has a namespace', () => {
    expect(
      isSameHardwareProfileBinding(
        { name: 'dra-profile' },
        { name: 'dra-profile', namespace: 'opendatahub' },
      ),
    ).toBe(false);
  });

  it('should compare the metadata of a hardware profile with a binding', () => {
    const profile = mockHardwareProfile({ name: 'dra-profile', namespace: 'opendatahub' });

    expect(
      isSameHardwareProfileBinding(profile.metadata, {
        name: 'dra-profile',
        namespace: 'opendatahub',
      }),
    ).toBe(true);
  });
});
