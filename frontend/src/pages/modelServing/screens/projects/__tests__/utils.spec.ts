import { mockDataConnection } from '~/__mocks__/mockDataConnection';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import {
  createNIMPVC,
  createNIMSecret,
  fetchNIMModelNames,
  filterOutConnectionsWithoutBucket,
  getCreateInferenceServiceLabels,
  getProjectModelServingPlatform,
  getUrlFromKserveInferenceService,
} from '~/pages/modelServing/screens/projects/utils';
import { LabeledDataConnection, ServingPlatformStatuses } from '~/pages/modelServing/screens/types';
import { ServingRuntimePlatform } from '~/types';
import { mockInferenceServiceK8sResource } from '~/__mocks__/mockInferenceServiceK8sResource';
import { createPvc, createSecret } from '~/api';
import { PersistentVolumeClaimKind, ServingRuntimeKind } from '~/k8sTypes';
import {
  getNIMData,
  getNIMResource,
  updateServingRuntimeTemplate,
} from '~/pages/modelServing/screens/projects/nimUtils';

jest.mock('~/api', () => ({
  getSecret: jest.fn(),
  createSecret: jest.fn(),
  createPvc: jest.fn(),
  getInferenceServiceContext: jest.fn(),
}));

jest.mock('~/pages/modelServing/screens/projects/nimUtils', () => ({
  ...jest.requireActual('~/pages/modelServing/screens/projects/nimUtils'),
  getNIMData: jest.fn(),
  getNIMResource: jest.fn(),
}));

describe('filterOutConnectionsWithoutBucket', () => {
  it('should return an empty array if input connections array is empty', () => {
    const inputConnections: LabeledDataConnection[] = [];
    const result = filterOutConnectionsWithoutBucket(inputConnections);
    expect(result).toEqual([]);
  });

  it('should filter out connections without an AWS_S3_BUCKET property', () => {
    const dataConnections = [
      { dataConnection: mockDataConnection({ name: 'name1', s3Bucket: 'bucket1' }) },
      { dataConnection: mockDataConnection({ name: 'name2', s3Bucket: '' }) },
      { dataConnection: mockDataConnection({ name: 'name3', s3Bucket: 'bucket2' }) },
    ];

    const result = filterOutConnectionsWithoutBucket(dataConnections);

    expect(result).toMatchObject([
      {
        dataConnection: { data: { data: { Name: 'name1' } } },
      },
      {
        dataConnection: { data: { data: { Name: 'name3' } } },
      },
    ]);
  });
});

const getMockServingPlatformStatuses = ({
  kServeEnabled = true,
  kServeInstalled = true,
  modelMeshEnabled = true,
  modelMeshInstalled = true,
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
  modelMesh: {
    enabled: modelMeshEnabled,
    installed: modelMeshInstalled,
  },
  platformEnabledCount: [kServeEnabled, nimEnabled, modelMeshEnabled].filter(Boolean).length,
  refreshNIMAvailability: async () => true,
});

describe('getProjectModelServingPlatform', () => {
  it('should return undefined if both KServe and ModelMesh are disabled, and project has no platform label', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({}),
        getMockServingPlatformStatuses({ kServeEnabled: false, modelMeshEnabled: false }),
      ),
    ).toStrictEqual({});
  });
  it('should return undefined if both KServe and ModelMesh are enabled, and project has no platform label', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({}),
        getMockServingPlatformStatuses({}),
      ),
    ).toStrictEqual({});
  });
  it('should return Single Platform if has platform label set to false and KServe is installed', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({ enableModelMesh: false }),
        getMockServingPlatformStatuses({}),
      ),
    ).toStrictEqual({ platform: ServingRuntimePlatform.SINGLE, error: undefined });
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({ enableModelMesh: false }),
        getMockServingPlatformStatuses({ kServeEnabled: false }),
      ),
    ).toStrictEqual({ platform: ServingRuntimePlatform.SINGLE, error: undefined });
  });
  it('should give error if has platform label set to false and KServe is not installed', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({ enableModelMesh: false }),
        getMockServingPlatformStatuses({ kServeEnabled: false, kServeInstalled: false }),
      ).error,
    ).not.toBeUndefined();
  });
  it('should return Multi Platform if has platform label set to true and ModelMesh is installed', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({ enableModelMesh: true }),
        getMockServingPlatformStatuses({}),
      ),
    ).toStrictEqual({ platform: ServingRuntimePlatform.MULTI, error: undefined });
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({ enableModelMesh: true }),
        getMockServingPlatformStatuses({ modelMeshEnabled: false }),
      ),
    ).toStrictEqual({ platform: ServingRuntimePlatform.MULTI, error: undefined });
  });
  it('should give error if has platform label set to true and ModelMesh is not installed', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({ enableModelMesh: true }),
        getMockServingPlatformStatuses({ modelMeshEnabled: false, modelMeshInstalled: false }),
      ).error,
    ).not.toBeUndefined();
  });
  it('should return Single Platform if only KServe is enabled, and project has no platform label', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({}),
        getMockServingPlatformStatuses({ modelMeshEnabled: false }),
      ),
    ).toStrictEqual({ platform: ServingRuntimePlatform.SINGLE });
  });
  it('should return Multi Platform if only ModelMesh is enabled, and project has no platform label', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({}),
        getMockServingPlatformStatuses({ kServeEnabled: false }),
      ),
    ).toStrictEqual({ platform: ServingRuntimePlatform.MULTI });
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
      registeredModelId: undefined,
      modelVersionId: undefined,
    });
    expect(createLabels).toBeUndefined();
  });

  it('returns labels with "registered-model-id" when "registeredModelId" is defined', () => {
    const createLabels = getCreateInferenceServiceLabels({
      registeredModelId: 'some-register-model-id',
      modelVersionId: undefined,
    });
    expect(createLabels).toEqual({
      labels: {
        'modelregistry.opendatahub.io/registered-model-id': 'some-register-model-id',
      },
    });
  });

  it('returns labels with "model-version-id" when "modelVersionId" is defined', () => {
    const createLabels = getCreateInferenceServiceLabels({
      registeredModelId: undefined,
      modelVersionId: 'some-model-version-id',
    });
    expect(createLabels).toEqual({
      labels: {
        'modelregistry.opendatahub.io/model-version-id': 'some-model-version-id',
      },
    });
  });

  it('returns labels with "registered-model-id" and "model-version-id" when registeredModelId and "modelVersionId" are defined', () => {
    const createLabels = getCreateInferenceServiceLabels({
      registeredModelId: 'some-register-model-id',
      modelVersionId: 'some-model-version-id',
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
      accessModes: ['ReadWriteOnce'],
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
