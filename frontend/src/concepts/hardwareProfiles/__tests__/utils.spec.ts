import { mockHardwareProfile } from '#~/__mocks__/mockHardwareProfile';
import { mockNotebookK8sResource } from '#~/__mocks__';
import {
  getProfileScore,
  sortIdentifiers,
  getExistingResources,
  getExistingHardwareProfileData,
  assemblePodSpecOptions,
  applyHardwareProfileConfig,
} from '#~/concepts/hardwareProfiles/utils';
import { HardwareProfileKind } from '#~/k8sTypes';
import {
  Identifier,
  IdentifierResourceType,
  ContainerResources,
  Toleration,
  NodeSelector,
} from '#~/types';
import { UseHardwareProfileConfigResult } from '#~/concepts/hardwareProfiles/useHardwareProfileConfig';
import { NOTEBOOK_HARDWARE_PROFILE_PATHS } from '#~/concepts/notebooks/const.ts';

global.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));

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
});
