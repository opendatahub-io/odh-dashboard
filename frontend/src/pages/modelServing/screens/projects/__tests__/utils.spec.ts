import { mockDataConnection } from '~/__mocks__/mockDataConnection';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import {
  filterOutConnectionsWithoutBucket,
  getCreateInferenceServiceLabels,
  getProjectModelServingPlatform,
  getUrlFromKserveInferenceService,
} from '~/pages/modelServing/screens/projects/utils';
import { LabeledDataConnection, ServingPlatformStatuses } from '~/pages/modelServing/screens/types';
import { ServingRuntimePlatform } from '~/types';
import { mockInferenceServiceK8sResource } from '~/__mocks__/mockInferenceServiceK8sResource';

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
}): ServingPlatformStatuses => ({
  kServe: {
    enabled: kServeEnabled,
    installed: kServeInstalled,
  },
  modelMesh: {
    enabled: modelMeshEnabled,
    installed: modelMeshInstalled,
  },
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
