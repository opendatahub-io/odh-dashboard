import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import {
  createNIMPVC,
  createNIMSecret,
  fetchNIMModelNames,
  getCreateInferenceServiceLabels,
  getProjectModelServingPlatform,
  getPVCFromURI,
  getModelPathFromUri,
  getUrlFromKserveInferenceService,
  isCurrentServingPlatformEnabled,
  isValueFromEnvVar,
  isPVCUri,
  getPVCNameFromURI,
} from '#~/pages/modelServing/screens/projects/utils';
import { ServingPlatformStatuses } from '#~/pages/modelServing/screens/types';
import { ServingRuntimePlatform } from '#~/types';
import { mockInferenceServiceK8sResource } from '#~/__mocks__/mockInferenceServiceK8sResource';
import { createPvc, createSecret } from '#~/api';
import { PersistentVolumeClaimKind, ServingRuntimeKind } from '#~/k8sTypes';
import {
  getNIMData,
  getNIMResource,
  updateServingRuntimeTemplate,
} from '#~/pages/modelServing/screens/projects/nim/nimUtils';
import { AccessMode } from '#~/pages/storageClasses/storageEnums';
import { mockPVCK8sResource } from '#~/__mocks__/mockPVCK8sResource';

jest.mock('#~/api', () => ({
  getSecret: jest.fn(),
  createSecret: jest.fn(),
  createPvc: jest.fn(),
  getInferenceServiceContext: jest.fn(),
}));

jest.mock('#~/pages/modelServing/screens/projects/nim/nimUtils', () => ({
  ...jest.requireActual('#~/pages/modelServing/screens/projects/nim/nimUtils'),
  getNIMData: jest.fn(),
  getNIMResource: jest.fn(),
}));

const getMockServingPlatformStatuses = ({
  kServeEnabled = true,
  kServeInstalled = true,
  nimEnabled = false,
  nimInstalled = false,
}): ServingPlatformStatuses => ({
  kServe: {
    enabled: kServeEnabled,
    installed: kServeInstalled,
  },
  kServeNIM: {
    enabled: nimEnabled,
    installed: nimInstalled,
  },
  platformEnabledCount: [kServeEnabled, nimEnabled].filter(Boolean).length,
  refreshNIMAvailability: async () => true,
});

describe('getProjectModelServingPlatform', () => {
  it('should return empty object when KServe is disabled and project has no platform label', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({}),
        getMockServingPlatformStatuses({ kServeEnabled: false }),
      ),
    ).toStrictEqual({});
  });
  it('should return Single Platform when KServe is enabled', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({}),
        getMockServingPlatformStatuses({}),
      ),
    ).toStrictEqual({ platform: ServingRuntimePlatform.SINGLE, error: undefined });
  });
  it('should return empty object when no platforms are enabled', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({}),
        getMockServingPlatformStatuses({ kServeEnabled: false, nimEnabled: false }),
      ),
    ).toStrictEqual({});
  });
  it('should return error when KServe is enabled but not installed', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({}),
        getMockServingPlatformStatuses({ kServeEnabled: true, kServeInstalled: false }),
      ).error,
    ).not.toBeUndefined();
  });
  it('should return Single Platform when NIM is enabled', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({}),
        getMockServingPlatformStatuses({ kServeEnabled: false, nimEnabled: true }),
      ),
    ).toStrictEqual({ platform: ServingRuntimePlatform.SINGLE, error: undefined });
  });
  it('should return empty object when both KServe and NIM are enabled but no platform is selected', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({}),
        getMockServingPlatformStatuses({ kServeEnabled: true, nimEnabled: true }),
      ),
    ).toStrictEqual({});
  });
  it('should return Single Platform when project has NIM annotation', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({ enableNIM: true }),
        getMockServingPlatformStatuses({ kServeEnabled: true, nimEnabled: true }),
      ),
    ).toStrictEqual({ platform: ServingRuntimePlatform.SINGLE, error: undefined });
  });
});

describe('getUrlsFromKserveInferenceService', () => {
  it('should return the url from the inference service status', () => {
    const url = 'https://test-kserve.apps.kserve-pm.dev.com';
    const inferenceService = mockInferenceServiceK8sResource({
      url,
    });
    expect(getUrlFromKserveInferenceService(inferenceService)).toBe(url);
  });
  it('should return undefined if the inference service status does not have an address', () => {
    const url = '';
    const inferenceService = mockInferenceServiceK8sResource({
      url,
    });
    expect(getUrlFromKserveInferenceService(inferenceService)).toBeUndefined();
  });
  it('should return undefined if the inference service status is an internal service', () => {
    const url = 'http://test.kserve.svc.cluster.local';
    const inferenceService = mockInferenceServiceK8sResource({
      url,
    });
    expect(getUrlFromKserveInferenceService(inferenceService)).toBeUndefined();
  });
});

describe('getCreateInferenceServiceLabels', () => {
  it('returns undefined when "registeredModelId" and "modelVersionId" are undefined', () => {
    const createLabels = getCreateInferenceServiceLabels({
      modelRegistryInfo: {
        registeredModelId: undefined,
        modelVersionId: undefined,
      },
    });
    expect(createLabels).toBeUndefined();
  });

  it('returns labels with "registered-model-id" when "registeredModelId" is defined', () => {
    const createLabels = getCreateInferenceServiceLabels({
      modelRegistryInfo: {
        registeredModelId: 'some-register-model-id',
        modelVersionId: undefined,
      },
    });
    expect(createLabels).toEqual({
      labels: {
        'modelregistry.opendatahub.io/registered-model-id': 'some-register-model-id',
      },
    });
  });

  it('returns labels with "model-version-id" when "modelVersionId" is defined', () => {
    const createLabels = getCreateInferenceServiceLabels({
      modelRegistryInfo: {
        registeredModelId: undefined,
        modelVersionId: 'some-model-version-id',
      },
    });
    expect(createLabels).toEqual({
      labels: {
        'modelregistry.opendatahub.io/model-version-id': 'some-model-version-id',
      },
    });
  });

  it('returns labels with "registered-model-id" and "model-version-id" when registeredModelId and "modelVersionId" are defined', () => {
    const createLabels = getCreateInferenceServiceLabels({
      modelRegistryInfo: {
        registeredModelId: 'some-register-model-id',
        modelVersionId: 'some-model-version-id',
      },
    });
    expect(createLabels).toEqual({
      labels: {
        'modelregistry.opendatahub.io/model-version-id': 'some-model-version-id',
        'modelregistry.opendatahub.io/registered-model-id': 'some-register-model-id',
      },
    });
  });
});

describe('createNIMSecret', () => {
  const projectName = 'test-project';
  const dryRun = false;

  const nimSecretMock = {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: 'ngc-secret',
      namespace: projectName,
    },
    data: {},
  };

  const nimSecretDataNGC = {
    '.dockerconfigjson': 'mocked-dockerconfig-json',
  };

  const nimSecretDataNonNGC = {
    NGC_API_KEY: 'mocked-api-key',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create NGC secret when isNGC is true', async () => {
    (getNIMData as jest.Mock).mockResolvedValueOnce(nimSecretDataNGC);
    (createSecret as jest.Mock).mockResolvedValueOnce(nimSecretMock);

    const result = await createNIMSecret(projectName, 'ngc-secret', true, dryRun);

    expect(getNIMData).toHaveBeenCalledWith('ngc-secret', true);
    expect(createSecret).toHaveBeenCalledWith(
      {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          name: 'ngc-secret',
          namespace: projectName,
        },
        data: nimSecretDataNGC,
        type: 'kubernetes.io/dockerconfigjson',
      },
      { dryRun },
    );
    expect(result).toEqual(nimSecretMock);
  });

  it('should create non-NGC secret when isNGC is false', async () => {
    (getNIMData as jest.Mock).mockResolvedValueOnce(nimSecretDataNonNGC);
    (createSecret as jest.Mock).mockResolvedValueOnce(nimSecretMock);

    const result = await createNIMSecret(projectName, 'nvidia-nim-secrets', false, dryRun);

    expect(getNIMData).toHaveBeenCalledWith('nvidia-nim-secrets', false);
    expect(createSecret).toHaveBeenCalledWith(
      {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          name: 'nvidia-nim-secrets',
          namespace: projectName,
        },
        data: nimSecretDataNonNGC,
        type: 'Opaque',
      },
      { dryRun },
    );
    expect(result).toEqual(nimSecretMock);
  });

  it('should reject if getNIMData throws an error', async () => {
    (getNIMData as jest.Mock).mockRejectedValueOnce(new Error('Error retrieving secret data'));

    await expect(createNIMSecret(projectName, 'ngc-secret', true, dryRun)).rejects.toThrow(
      'Error creating NGC secret',
    );
  });

  it('should reject if createSecret throws an error', async () => {
    (getNIMData as jest.Mock).mockResolvedValueOnce(nimSecretDataNonNGC);
    (createSecret as jest.Mock).mockRejectedValueOnce(new Error('Error creating secret'));

    await expect(createNIMSecret(projectName, 'nvidia-nim-secrets', false, dryRun)).rejects.toThrow(
      'Error creating NIM secret',
    );
  });

  it('should create NGC secret with dummy values when isAirGapped is true', async () => {
    (createSecret as jest.Mock).mockResolvedValueOnce(nimSecretMock);

    const result = await createNIMSecret(projectName, 'ngc-secret', true, dryRun, true);

    // In air-gapped mode, should NOT call getNIMData
    expect(getNIMData).not.toHaveBeenCalled();

    // Should create secret with dummy dockerconfigjson
    expect(createSecret).toHaveBeenCalledWith(
      expect.objectContaining({
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          name: 'ngc-secret',
          namespace: projectName,
        },
        type: 'kubernetes.io/dockerconfigjson',
        data: expect.objectContaining({
          '.dockerconfigjson': expect.any(String),
        }),
      }),
      { dryRun },
    );

    // Verify the dummy dockerconfigjson contains placeholder values
    const createSecretCall = (createSecret as jest.Mock).mock.calls[0][0];
    const decodedDockerConfig = JSON.parse(atob(createSecretCall.data['.dockerconfigjson']));
    expect(decodedDockerConfig).toEqual({
      auths: {
        'nvcr.io': {
          username: '$oauthtoken',
          password: 'air-gapped-placeholder',
          auth: btoa('$oauthtoken:air-gapped-placeholder'),
        },
      },
    });

    expect(result).toEqual(nimSecretMock);
  });

  it('should create non-NGC secret with dummy API key when isAirGapped is true', async () => {
    (createSecret as jest.Mock).mockResolvedValueOnce(nimSecretMock);

    const result = await createNIMSecret(projectName, 'nvidia-nim-secrets', false, dryRun, true);

    // In air-gapped mode, should NOT call getNIMData
    expect(getNIMData).not.toHaveBeenCalled();

    // Should create secret with dummy NGC_API_KEY
    expect(createSecret).toHaveBeenCalledWith(
      expect.objectContaining({
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          name: 'nvidia-nim-secrets',
          namespace: projectName,
        },
        type: 'Opaque',
        data: {
          NGC_API_KEY: btoa('air-gapped-placeholder-key'),
        },
      }),
      { dryRun },
    );

    expect(result).toEqual(nimSecretMock);
  });

  it('should default to normal mode when isAirGapped is not provided', async () => {
    (getNIMData as jest.Mock).mockResolvedValueOnce(nimSecretDataNGC);
    (createSecret as jest.Mock).mockResolvedValueOnce(nimSecretMock);

    // Call without isAirGapped parameter (should default to false)
    const result = await createNIMSecret(projectName, 'ngc-secret', true, dryRun);

    // Should call getNIMData in normal mode
    expect(getNIMData).toHaveBeenCalledWith('ngc-secret', true);
    expect(result).toEqual(nimSecretMock);
  });

  it('should still reject in air-gapped mode if createSecret fails', async () => {
    (createSecret as jest.Mock).mockRejectedValueOnce(new Error('K8s API error'));

    await expect(createNIMSecret(projectName, 'ngc-secret', true, dryRun, true)).rejects.toThrow(
      'Error creating NGC secret',
    );

    expect(getNIMData).not.toHaveBeenCalled();
  });
});

describe('fetchNIMModelNames', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  const configMapMock = {
    data: {
      model1: JSON.stringify({
        displayName: 'Model One',
        shortDescription: 'First model description',
        namespace: 'namespace-one',
        tags: ['tag1', 'tag2'],
        latestTag: 'v1.0.0',
        updatedDate: '2024-09-15T00:00:00Z',
      }),
      model2: JSON.stringify({
        displayName: 'Model Two',
        shortDescription: 'Second model description',
        namespace: 'namespace-two',
        tags: ['tag3', 'tag4'],
        latestTag: 'v2.0.0',
        updatedDate: '2024-09-16T00:00:00Z',
      }),
    },
  };

  it('should return model infos when configMap has data', async () => {
    (getNIMResource as jest.Mock).mockResolvedValueOnce(configMapMock);

    const result = await fetchNIMModelNames();

    expect(getNIMResource).toHaveBeenCalledWith('nimConfig');
    expect(result).toEqual([
      {
        name: 'model1',
        displayName: 'Model One',
        shortDescription: 'First model description',
        namespace: 'namespace-one',
        tags: ['tag1', 'tag2'],
        latestTag: 'v1.0.0',
        updatedDate: '2024-09-15T00:00:00Z',
      },
      {
        name: 'model2',
        displayName: 'Model Two',
        shortDescription: 'Second model description',
        namespace: 'namespace-two',
        tags: ['tag3', 'tag4'],
        latestTag: 'v2.0.0',
        updatedDate: '2024-09-16T00:00:00Z',
      },
    ]);
  });

  it('should return undefined if configMap has no data', async () => {
    (getNIMResource as jest.Mock).mockResolvedValueOnce({ data: {} });

    const result = await fetchNIMModelNames();

    expect(getNIMResource).toHaveBeenCalledWith('nimConfig');
    expect(result).toBeUndefined();
  });

  it('should return undefined if configMap.data is not defined', async () => {
    (getNIMResource as jest.Mock).mockResolvedValueOnce({ data: undefined });

    const result = await fetchNIMModelNames();

    expect(getNIMResource).toHaveBeenCalledWith('nimConfig');
    expect(result).toBeUndefined();
  });

  it('should skip registry and imagePullSecret fields when parsing ConfigMap', async () => {
    const configMapWithAirGappedFields = {
      data: {
        registry: 'internal-registry.company.com',
        imagePullSecret: 'custom-pull-secret',
        model1: JSON.stringify({
          displayName: 'Model One',
          shortDescription: 'Test model',
          namespace: 'nim/test',
          tags: ['1.0.0'],
          latestTag: '1.0.0',
          updatedDate: '2024-09-15T00:00:00Z',
        }),
      },
    };

    (getNIMResource as jest.Mock).mockResolvedValueOnce(configMapWithAirGappedFields);

    const result = await fetchNIMModelNames();

    // Should only return model1, not registry or imagePullSecret
    expect(result).toEqual([
      {
        name: 'model1',
        displayName: 'Model One',
        shortDescription: 'Test model',
        namespace: 'nim/test',
        tags: ['1.0.0'],
        latestTag: '1.0.0',
        updatedDate: '2024-09-15T00:00:00Z',
        registry: undefined,
      },
    ]);
  });

  it('should parse model-specific registry override from ConfigMap', async () => {
    const configMapWithModelRegistry = {
      data: {
        model1: JSON.stringify({
          displayName: 'Model One',
          shortDescription: 'Test model',
          namespace: 'nim/test',
          tags: ['1.0.0'],
          latestTag: '1.0.0',
          updatedDate: '2024-09-15T00:00:00Z',
          registry: 'custom-model-registry.io',
        }),
      },
    };

    (getNIMResource as jest.Mock).mockResolvedValueOnce(configMapWithModelRegistry);

    const result = await fetchNIMModelNames();

    expect(result).toEqual([
      {
        name: 'model1',
        displayName: 'Model One',
        shortDescription: 'Test model',
        namespace: 'nim/test',
        tags: ['1.0.0'],
        latestTag: '1.0.0',
        updatedDate: '2024-09-15T00:00:00Z',
        registry: 'custom-model-registry.io',
      },
    ]);
  });

  it('should return undefined when ConfigMap only contains air-gapped fields', async () => {
    const configMapOnlyAirGapped = {
      data: {
        registry: 'internal-registry.company.com',
        imagePullSecret: 'custom-pull-secret',
      },
    };

    (getNIMResource as jest.Mock).mockResolvedValueOnce(configMapOnlyAirGapped);

    const result = await fetchNIMModelNames();

    // No models, only air-gapped config
    expect(result).toBeUndefined();
  });

  it('should throw error when model data is not valid JSON', async () => {
    const configMapWithInvalidJSON = {
      data: {
        model1: 'not-valid-json',
      },
    };

    (getNIMResource as jest.Mock).mockResolvedValueOnce(configMapWithInvalidJSON);

    await expect(fetchNIMModelNames()).rejects.toThrow(
      'Failed to parse model data for key "model1"',
    );
  });
});

describe('createNIMPVC', () => {
  const projectName = 'test-project';
  const pvcName = 'test-pvc';
  const pvcSize = '10Gi';
  const dryRun = true;
  const storageClassName = 'testStorageClass';

  const pvcMock: PersistentVolumeClaimKind = {
    apiVersion: 'v1',
    kind: 'PersistentVolumeClaim',
    metadata: {
      name: pvcName,
      namespace: projectName,
    },
    spec: {
      accessModes: [AccessMode.RWO],
      resources: {
        requests: {
          storage: pvcSize,
        },
      },
      volumeMode: 'Filesystem',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call createPvc with correct arguments and return the result', async () => {
    (createPvc as jest.Mock).mockResolvedValueOnce(pvcMock);
    const result = await createNIMPVC(projectName, pvcName, pvcSize, dryRun, storageClassName);

    expect(createPvc).toHaveBeenCalledWith(
      {
        name: pvcName,
        description: '',
        size: pvcSize,
        storageClassName,
      },
      projectName,
      { dryRun },
      true,
      undefined,
      {
        'opendatahub.io/managed': 'true',
      },
    );
    expect(result).toEqual(pvcMock);
  });

  it('should handle the dryRun flag correctly', async () => {
    const dryRunFlag = false;
    await createNIMPVC(projectName, pvcName, pvcSize, dryRunFlag, storageClassName);

    expect(createPvc).toHaveBeenCalledWith(
      {
        name: pvcName,
        description: '',
        size: pvcSize,
        storageClassName,
      },
      projectName,
      { dryRun: dryRunFlag },
      true,
      undefined,
      {
        'opendatahub.io/managed': 'true',
      },
    );
  });
});

describe('updateServingRuntimeTemplate', () => {
  const servingRuntimeMock: ServingRuntimeKind = {
    apiVersion: 'serving.kserve.io/v1alpha1',
    kind: 'ServingRuntime',
    metadata: {
      name: 'test-serving-runtime',
      namespace: 'test-namespace',
    },
    spec: {
      containers: [
        {
          name: 'test-container',
          volumeMounts: [
            { name: 'nim-pvc', mountPath: '/mnt/models/cache' },
            { name: 'other-volume', mountPath: '/mnt/other-path' },
          ],
        },
      ],
      volumes: [
        { name: 'nim-pvc', persistentVolumeClaim: { claimName: 'old-nim-pvc' } },
        { name: 'other-volume', emptyDir: {} },
      ],
    },
  };

  it('should update PVC name in volumeMounts and volumes', () => {
    const pvcName = 'new-nim-pvc';
    const updatedServingRuntime = updateServingRuntimeTemplate(servingRuntimeMock, pvcName);

    expect(updatedServingRuntime.spec.containers[0].volumeMounts).toEqual([
      { name: pvcName, mountPath: '/mnt/models/cache' },
      { name: 'other-volume', mountPath: '/mnt/other-path' },
    ]);

    expect(updatedServingRuntime.spec.volumes).toEqual([
      { name: pvcName, persistentVolumeClaim: { claimName: pvcName } },
      { name: 'other-volume', emptyDir: {} },
    ]);
  });

  it('should not modify unrelated volumeMounts and volumes', () => {
    const pvcName = 'new-nim-pvc';
    const updatedServingRuntime = updateServingRuntimeTemplate(servingRuntimeMock, pvcName);

    expect(updatedServingRuntime.spec.containers[0].volumeMounts?.[1]).toEqual({
      name: 'other-volume',
      mountPath: '/mnt/other-path',
    });

    expect(updatedServingRuntime.spec.volumes?.[1]).toEqual({
      name: 'other-volume',
      emptyDir: {},
    });
  });

  it('should handle serving runtime with containers but no volumeMounts', () => {
    const servingRuntimeWithoutVolumeMounts: ServingRuntimeKind = {
      apiVersion: 'serving.kserve.io/v1alpha1',
      kind: 'ServingRuntime',
      metadata: {
        name: 'test-serving-runtime-no-volumeMounts',
        namespace: 'test-namespace',
      },
      spec: {
        containers: [
          {
            name: 'test-container',
          },
        ],
      },
    };

    const pvcName = 'new-nim-pvc';
    const result = updateServingRuntimeTemplate(servingRuntimeWithoutVolumeMounts, pvcName);

    expect(result.spec.containers[0].volumeMounts).toBeUndefined();
  });
});

describe('isCurrentServingPlatformEnabled', () => {
  const baseStatuses = {
    kServe: { enabled: true, installed: true },
    kServeNIM: { enabled: false, installed: false },
    platformEnabledCount: 2,
    refreshNIMAvailability: async () => true,
  };

  it('returns true if currentPlatform is single and kServe is enabled', () => {
    expect(isCurrentServingPlatformEnabled(ServingRuntimePlatform.SINGLE, baseStatuses)).toBe(true);
  });

  it('returns false if currentPlatform is single and kServe is disabled', () => {
    const statuses = { ...baseStatuses, kServe: { enabled: false, installed: true } };
    expect(isCurrentServingPlatformEnabled(ServingRuntimePlatform.SINGLE, statuses)).toBe(false);
  });

  it('returns false if currentPlatform is undefined', () => {
    expect(isCurrentServingPlatformEnabled(undefined, baseStatuses)).toBe(false);
  });
});

describe('isValueFrom', () => {
  it('should return true if the value is from a valueFrom envVar', () => {
    expect(
      isValueFromEnvVar({
        valueFrom: {
          secretKeyRef: {
            name: 'test',
            key: '',
          },
        },
        name: '',
      }),
    ).toBe(true);
  });

  it('should return false if the value is not from a valueFrom envVar', () => {
    expect(
      isValueFromEnvVar({
        value: 'test',
        name: '',
      }),
    ).toBe(false);
  });
});

describe('getPVCFromURI', () => {
  it('should return the PVC from the URI', () => {
    const uri = 'pvc://pvc-1/model-path';
    const pvcs = [
      mockPVCK8sResource({ name: 'pvc-1', uid: 'pvc-1-uid' }),
      mockPVCK8sResource({ name: 'pvc-2', uid: 'pvc-2-uid' }),
    ];
    expect(getPVCFromURI(uri, pvcs)).toEqual(
      mockPVCK8sResource({ name: 'pvc-1', uid: 'pvc-1-uid' }),
    );
  });
  it('should return undefined if the pvc is not found', () => {
    const uri = 'pvc://pvc-3/model-path';
    const pvcs = [
      mockPVCK8sResource({ name: 'pvc-1', uid: 'pvc-1-uid' }),
      mockPVCK8sResource({ name: 'pvc-2', uid: 'pvc-2-uid' }),
    ];
    expect(getPVCFromURI(uri, pvcs)).toBeUndefined();
  });
});

describe('getModelPathFromUri', () => {
  it('should return the model path', () => {
    const uri = 'pvc://pvc-1/model-path';
    expect(getModelPathFromUri(uri)).toEqual('model-path');
  });
  it('should return an empty string if the URI is not a valid URI', () => {
    const uri = 'not a uri';
    expect(getModelPathFromUri(uri)).toEqual('');
  });
});

describe('isPVCUri', () => {
  it('should return true if the URI is a PVC URI', () => {
    const uri = 'pvc://pvc-1/model-path';
    expect(isPVCUri(uri)).toEqual(true);
  });
  it('should return false if the URI is not a PVC URI', () => {
    const uri = 'not a uri';
    expect(isPVCUri(uri)).toEqual(false);
  });
});

describe('getPVCNameFromURI', () => {
  it('should return the PVC name from the URI', () => {
    const uri = 'pvc://pvc-1/model-path';
    expect(getPVCNameFromURI(uri)).toEqual('pvc-1');
  });
  it('should return an empty string if the URI is not a valid URI', () => {
    const uri = 'not a uri';
    expect(getPVCNameFromURI(uri)).toEqual('');
  });
  it('should return an empty string if the URI is not a PVC URI', () => {
    const uri = 'http://pvc-1/model-path';
    expect(getPVCNameFromURI(uri)).toEqual('');
  });
});
