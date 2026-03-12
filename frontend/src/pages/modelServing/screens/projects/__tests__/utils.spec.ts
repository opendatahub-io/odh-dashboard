import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import {
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
import { ServingRuntimeKind } from '#~/k8sTypes';
import { updateServingRuntimeTemplate } from '#~/pages/modelServing/screens/projects/nim/nimUtils';
import { mockPVCK8sResource } from '#~/__mocks__/mockPVCK8sResource';

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
