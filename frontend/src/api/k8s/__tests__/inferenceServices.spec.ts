import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  K8sStatus,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { mockInferenceServiceK8sResource } from '#~/__mocks__/mockInferenceServiceK8sResource';
import { mockInferenceServiceModalData } from '#~/__mocks__/mockInferenceServiceModalData';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { mock200Status, mock404Error } from '#~/__mocks__/mockK8sStatus';
import { mockModelServingPodSpecOptions } from '#~/__mocks__/mockModelServingPodSpecOptions';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import { applyK8sAPIOptions } from '#~/api/apiMergeUtils';
import {
  assembleInferenceService,
  createInferenceService,
  deleteInferenceService,
  getInferenceService,
  getInferenceServiceContext,
  listInferenceService,
  listScopedInferenceService,
  updateInferenceService,
} from '#~/api/k8s/inferenceServices';
import { InferenceServiceModel, ProjectModel } from '#~/api/models';
import { ModelServingPodSpecOptions } from '#~/concepts/hardwareProfiles/useModelServingPodSpecOptionsState';
import { DeploymentMode, InferenceServiceKind, ProjectKind, KnownLabels } from '#~/k8sTypes';
import { ModelServingSize } from '#~/pages/modelServing/screens/types';
import { TolerationEffect, TolerationOperator } from '#~/types';
import { mockHardwareProfile } from '#~/__mocks__/mockHardwareProfile.ts';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
  k8sGetResource: jest.fn(),
  k8sCreateResource: jest.fn(),
  k8sUpdateResource: jest.fn(),
  k8sDeleteResource: jest.fn(),
}));

const k8sListResourceMock = jest.mocked(k8sListResource<InferenceServiceKind | ProjectKind>);
const k8sGetResourceMock = jest.mocked(k8sGetResource<InferenceServiceKind>);
const k8sCreateResourceMock = jest.mocked(k8sCreateResource<InferenceServiceKind>);
const k8sUpdateResourceMock = jest.mocked(k8sUpdateResource<InferenceServiceKind>);
const k8sDeleteResourceMock = jest.mocked(k8sDeleteResource<InferenceServiceKind, K8sStatus>);

global.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));

describe('assembleInferenceService', () => {
  it('should have the right annotations when creating for Kserve', async () => {
    const inferenceService = assembleInferenceService(mockInferenceServiceModalData({}));

    expect(inferenceService.metadata.annotations).toBeDefined();
    expect(inferenceService.metadata.annotations?.['serving.kserve.io/deploymentMode']).toBe(
      DeploymentMode.RawDeployment,
    );
    expect(inferenceService.metadata.annotations?.['security.opendatahub.io/enable-auth']).toBe(
      undefined,
    );
  });

  it('should have the right annotations when creating for Kserve with auth', async () => {
    const inferenceService = assembleInferenceService(
      mockInferenceServiceModalData({ tokenAuth: true }),
    );

    expect(inferenceService.metadata.annotations).toBeDefined();
    expect(inferenceService.metadata.annotations?.['serving.kserve.io/deploymentMode']).toBe(
      DeploymentMode.RawDeployment,
    );
    expect(inferenceService.metadata.annotations?.['security.opendatahub.io/enable-auth']).toBe(
      'true',
    );
  });

  it('should have the right labels when creating for Kserve with public route', async () => {
    const inferenceService = assembleInferenceService(
      mockInferenceServiceModalData({ externalRoute: true }),
    );

    expect(inferenceService.metadata.labels?.['networking.kserve.io/visibility']).toBe('exposed');

    const missingExternalRoute = assembleInferenceService(
      mockInferenceServiceModalData({ externalRoute: false }),
    );

    expect(missingExternalRoute.metadata.labels?.['networking.kserve.io/visibility']).toBe(
      undefined,
    );
  });

  it('should have the right labels when creating for Modelmesh with public route', async () => {
    const missingExternalRoute = assembleInferenceService(
      mockInferenceServiceModalData({ externalRoute: true }),
      undefined,
      undefined,
      true,
    );

    expect(missingExternalRoute.metadata.labels?.['networking.knative.dev/visibility']).toBe(
      undefined,
    );
  });

  it('should handle name and display name', async () => {
    const displayName = 'Llama model';
    const resourceName = 'llama-model';

    const inferenceService = assembleInferenceService(
      mockInferenceServiceModalData({ name: displayName, k8sName: resourceName }),
    );

    expect(inferenceService.metadata.annotations).toBeDefined();
    expect(inferenceService.metadata.annotations?.['openshift.io/display-name']).toBe(displayName);
    expect(inferenceService.metadata.name).toBe(resourceName);
  });

  it('should have right annotations when inference is present', async () => {
    const mockInferenceService = mockInferenceServiceK8sResource({});
    const { name } = mockInferenceService.metadata;
    const inferenceService = assembleInferenceService(
      mockInferenceServiceModalData({ name }),
      undefined,
      undefined,
      true,
      mockInferenceService,
    );
    expect(inferenceService.metadata.annotations).toBeDefined();
    expect(inferenceService.metadata.name).toBe(name);
    expect(inferenceService.metadata.annotations?.['openshift.io/display-name']).toBe(name);
  });

  it('should not add resources and tolerations if modelmesh', async () => {
    const podSpecOption: ModelServingPodSpecOptions = mockModelServingPodSpecOptions({
      resources: {
        requests: {
          'nvidia.com/gpu': 1,
        },
        limits: {
          'nvidia.com/gpu': 1,
        },
      },
      tolerations: [
        {
          key: 'nvidia.com/gpu',
          operator: TolerationOperator.EXISTS,
          effect: TolerationEffect.NO_SCHEDULE,
        },
      ],
    });

    const inferenceService = assembleInferenceService(
      mockInferenceServiceModalData({}),
      undefined,
      undefined,
      true,
      undefined,
      undefined,
      podSpecOption,
    );

    expect(inferenceService.spec.predictor.tolerations).toBeUndefined();
    expect(inferenceService.spec.predictor.model?.resources).toBeUndefined();
  });

  it('should provide max and min replicas if provided', async () => {
    const replicaCount = 2;

    const podSpecOption: ModelServingPodSpecOptions = mockModelServingPodSpecOptions({});
    const inferenceService = assembleInferenceService(
      mockInferenceServiceModalData({
        maxReplicas: replicaCount,
        minReplicas: replicaCount,
      }),
      undefined,
      undefined,
      false,
      undefined,
      undefined,
      podSpecOption,
    );

    expect(inferenceService.spec.predictor.maxReplicas).toBe(replicaCount);
    expect(inferenceService.spec.predictor.minReplicas).toBe(replicaCount);
  });

  it('should omit replica count for modelmesh', async () => {
    const podSpecOption: ModelServingPodSpecOptions = mockModelServingPodSpecOptions({});

    const inferenceService = assembleInferenceService(
      mockInferenceServiceModalData({}),
      undefined,
      undefined,
      true,
      undefined,
      undefined,
      podSpecOption,
    );

    expect(inferenceService.spec.predictor.maxReplicas).toBeUndefined();
    expect(inferenceService.spec.predictor.minReplicas).toBeUndefined();
  });

  it('should provide imagePullSecrets if provided', async () => {
    const imagePullSecret = { name: 'test-quay-pull-secret' };

    const inferenceService = assembleInferenceService(
      mockInferenceServiceModalData({ imagePullSecrets: [imagePullSecret] }),
    );

    expect(inferenceService.spec.predictor.imagePullSecrets).toContainEqual(imagePullSecret);
  });

  it('should omit imagePullSecrets for modelmesh', async () => {
    const inferenceService = assembleInferenceService(
      mockInferenceServiceModalData({}),
      undefined,
      undefined,
      true,
      undefined,
      undefined,
    );

    expect(inferenceService.spec.predictor.imagePullSecrets).toBeUndefined();
  });

  it('should add requests on kserve', async () => {
    const podSpecOption: ModelServingPodSpecOptions = mockModelServingPodSpecOptions({
      resources: {
        requests: {
          cpu: '1',
          memory: '1Gi',
        },
        limits: {
          cpu: '2',
          memory: '2Gi',
        },
      },
    });

    const modelSize: ModelServingSize = {
      name: 'Small',
      resources: {
        requests: {
          cpu: '1',
          memory: '1Gi',
        },
        limits: {
          cpu: '2',
          memory: '2Gi',
        },
      },
    };

    const inferenceService = assembleInferenceService(
      mockInferenceServiceModalData({}),
      undefined,
      undefined,
      false,
      undefined,
      undefined,
      podSpecOption,
    );

    expect(inferenceService.spec.predictor.model?.resources?.requests?.cpu).toBe(
      modelSize.resources.requests?.cpu,
    );
    expect(inferenceService.spec.predictor.model?.resources?.requests?.memory).toBe(
      modelSize.resources.requests?.memory,
    );
    expect(inferenceService.spec.predictor.model?.resources?.limits?.cpu).toBe(
      modelSize.resources.limits?.cpu,
    );
    expect(inferenceService.spec.predictor.model?.resources?.limits?.memory).toBe(
      modelSize.resources.limits?.memory,
    );
  });

  it('should add requests on kserve but omit on modelmesh', async () => {
    const podSpecOption: ModelServingPodSpecOptions = mockModelServingPodSpecOptions({
      resources: {
        requests: {
          cpu: '1',
          memory: '1Gi',
        },
        limits: {
          cpu: '2',
          memory: '2Gi',
        },
      },
    });

    // Test with modelmesh
    const inferenceServiceModelMesh = assembleInferenceService(
      mockInferenceServiceModalData({}),
      undefined,
      undefined,
      true,
      undefined,
      undefined,
      podSpecOption,
    );

    expect(inferenceServiceModelMesh.spec.predictor.model?.resources).toBeUndefined();

    // Test with KServe
    const inferenceServiceKServe = assembleInferenceService(
      mockInferenceServiceModalData({}),
      undefined,
      undefined,
      false,
      undefined,
      undefined,
      podSpecOption,
    );

    expect(inferenceServiceKServe.spec.predictor.model?.resources).toBeDefined();
    expect(inferenceServiceKServe.spec.predictor.model?.resources?.requests?.cpu).toBe('1');
    expect(inferenceServiceKServe.spec.predictor.model?.resources?.requests?.memory).toBe('1Gi');
    expect(inferenceServiceKServe.spec.predictor.model?.resources?.limits?.cpu).toBe('2');
    expect(inferenceServiceKServe.spec.predictor.model?.resources?.limits?.memory).toBe('2Gi');
  });

  it('should have base annotations for kserve raw', async () => {
    const inferenceService = assembleInferenceService(mockInferenceServiceModalData({}));
    const { annotations, labels } = inferenceService.metadata;

    expect(annotations?.['serving.kserve.io/deploymentMode']).toBe(DeploymentMode.RawDeployment);

    expect(annotations?.['serving.knative.openshift.io/enablePassthrough']).toBe(undefined);
    expect(annotations?.['sidecar.istio.io/inject']).toBe(undefined);
    expect(annotations?.['sidecar.istio.io/rewriteAppHTTPProbers']).toBe(undefined);
    expect(annotations?.['security.opendatahub.io/enable-auth']).toBe(undefined);
    expect(labels?.['networking.kserve.io/visibility']).toBe(undefined);
    expect(labels?.['networking.knative.dev/visibility']).toBe(undefined);
  });

  it('should have correct auth and routing for kserve raw', async () => {
    const ext = assembleInferenceService(mockInferenceServiceModalData({ externalRoute: true }));
    expect(ext.metadata.annotations?.['serving.kserve.io/deploymentMode']).toBe(
      DeploymentMode.RawDeployment,
    );
    expect(ext.metadata.annotations?.['security.opendatahub.io/enable-auth']).toBe(undefined);
    expect(ext.metadata.annotations?.['security.opendatahub.io/enable-auth']).toBe(undefined);
    expect(ext.metadata.labels?.['networking.kserve.io/visibility']).toBe('exposed');
    expect(ext.metadata.labels?.['networking.knative.dev/visibility']).toBe(undefined);

    const auth = assembleInferenceService(mockInferenceServiceModalData({ tokenAuth: true }));
    expect(auth.metadata.annotations?.['serving.kserve.io/deploymentMode']).toBe(
      DeploymentMode.RawDeployment,
    );
    expect(auth.metadata.annotations?.['security.opendatahub.io/enable-auth']).toBe('true');
    expect(auth.metadata.labels?.['networking.kserve.io/visibility']).toBe(undefined);
    expect(auth.metadata.labels?.['networking.knative.dev/visibility']).toBe(undefined);

    const both = assembleInferenceService(
      mockInferenceServiceModalData({
        externalRoute: true,
        tokenAuth: true,
      }),
    );
    expect(both.metadata.annotations?.['serving.kserve.io/deploymentMode']).toBe(
      DeploymentMode.RawDeployment,
    );
    expect(both.metadata.annotations?.['security.opendatahub.io/enable-auth']).toBe('true');
    expect(both.metadata.labels?.['networking.kserve.io/visibility']).toBe('exposed');
    expect(both.metadata.labels?.['networking.knative.dev/visibility']).toBe(undefined);
  });

  it('should set hardware profile annotation for real profiles', () => {
    const hardwareProfile = mockHardwareProfile({ name: 'real-profile' });
    hardwareProfile.metadata.uid = 'test-uid';
    const podSpecOptions = mockModelServingPodSpecOptions({
      selectedHardwareProfile: hardwareProfile,
    });
    const result = assembleInferenceService(
      mockInferenceServiceModalData({
        externalRoute: true,
        tokenAuth: true,
      }),
      undefined,
      undefined,
      false,
      undefined,
      undefined,
      podSpecOptions,
    );
    expect(result.metadata.annotations?.['opendatahub.io/hardware-profile-name']).toBe(
      'real-profile',
    );
  });

  it('should set hardware profile namespace annotation for real profiles if not model mesh', () => {
    const hardwareProfile = mockHardwareProfile({ name: 'real-profile' });
    hardwareProfile.metadata.uid = 'test-uid';
    const podSpecOptions = mockModelServingPodSpecOptions({
      selectedHardwareProfile: hardwareProfile,
    });
    const result = assembleInferenceService(
      mockInferenceServiceModalData({
        externalRoute: true,
        tokenAuth: true,
      }),
      undefined,
      undefined,
      false,
      undefined,
      undefined,
      podSpecOptions,
    );
    expect(result.metadata.annotations?.['opendatahub.io/hardware-profile-name']).toBe(
      'real-profile',
    );
  });

  it('should set hardware profile namespace annotation to dashboard namespace when global scoped and not model mesh', () => {
    const hardwareProfile = mockHardwareProfile({ name: 'real-profile' });
    const podSpecOptions = mockModelServingPodSpecOptions({
      selectedHardwareProfile: hardwareProfile,
    });
    const result = assembleInferenceService(
      mockInferenceServiceModalData({
        externalRoute: true,
        tokenAuth: true,
      }),
      undefined,
      undefined,
      false,
      undefined,
      undefined,
      podSpecOptions,
    );
    expect(result.metadata.annotations?.['opendatahub.io/hardware-profile-namespace']).toBe(
      'opendatahub',
    );
  });

  it('should not set pod specs like tolerations and nodeSelector for hardware profiles', () => {
    const hardwareProfile = mockHardwareProfile({});
    hardwareProfile.metadata.uid = 'test-uid'; // not a legacy hardware profile
    const podSpecOptions = mockModelServingPodSpecOptions({
      selectedHardwareProfile: hardwareProfile,
    });

    // Test with modelmesh
    const resultModelMesh = assembleInferenceService(
      mockInferenceServiceModalData({
        externalRoute: true,
        tokenAuth: true,
      }),
      undefined,
      undefined,
      true,
      undefined,
      undefined,
      podSpecOptions,
    );

    expect(resultModelMesh.spec.tolerations).toBeUndefined();
    expect(resultModelMesh.spec.nodeSelector).toBeUndefined();

    // Test with KServe
    const resultKServe = assembleInferenceService(
      mockInferenceServiceModalData({
        externalRoute: true,
        tokenAuth: true,
      }),
      undefined,
      undefined,
      false,
      undefined,
      undefined,
      podSpecOptions,
    );

    expect(resultKServe.spec.predictor.tolerations).toBeUndefined();
    expect(resultKServe.spec.predictor.nodeSelector).toBeUndefined();
  });
});

describe('listInferenceService', () => {
  it('should return list of inference service', async () => {
    const inferenceServiceMock = mockInferenceServiceK8sResource({});
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([inferenceServiceMock]));
    const result = await listInferenceService();
    expect(result).toStrictEqual([inferenceServiceMock]);
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: InferenceServiceModel,
      queryOptions: { queryParams: {} },
    });
  });

  it('should handle errors and rethrows', async () => {
    k8sListResourceMock.mockRejectedValue(new Error('error'));
    await expect(listInferenceService()).rejects.toThrow('error');
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: InferenceServiceModel,
      queryOptions: { queryParams: {} },
    });
  });
});

describe('listScopedInferenceService', () => {
  it('should return list of scoped inference service with no label selector', async () => {
    const inferenceServiceMock = mockInferenceServiceK8sResource({});
    const { name } = inferenceServiceMock.metadata;
    k8sListResourceMock
      .mockResolvedValueOnce(mockK8sResourceList([mockProjectK8sResource({ k8sName: name })]))
      .mockResolvedValueOnce(mockK8sResourceList([inferenceServiceMock]));
    const result = await listScopedInferenceService();
    expect(result).toStrictEqual([inferenceServiceMock]);
    expect(k8sListResourceMock).toHaveBeenNthCalledWith(1, {
      fetchOptions: { requestInit: {} },
      model: ProjectModel,
      queryOptions: {
        queryParams: { labelSelector: 'opendatahub.io/dashboard=true,modelmesh-enabled' },
      },
    });
    expect(k8sListResourceMock).toHaveBeenNthCalledWith(2, {
      fetchOptions: { requestInit: {} },
      model: InferenceServiceModel,
      queryOptions: {
        ns: name,
        queryParams: {},
      },
    });
    expect(k8sListResourceMock).toHaveBeenCalledTimes(2);
  });

  it('should return list of scoped inference service with label selector', async () => {
    const inferenceServiceMock = mockInferenceServiceK8sResource({});
    const { name } = inferenceServiceMock.metadata;
    const labelSelector = 'test';
    k8sListResourceMock
      .mockResolvedValueOnce(mockK8sResourceList([mockProjectK8sResource({ k8sName: name })]))
      .mockResolvedValueOnce(mockK8sResourceList([inferenceServiceMock]));
    const result = await listScopedInferenceService(labelSelector);
    expect(result).toStrictEqual([inferenceServiceMock]);
    expect(k8sListResourceMock).toHaveBeenNthCalledWith(1, {
      fetchOptions: { requestInit: {} },
      model: ProjectModel,
      queryOptions: {
        queryParams: { labelSelector: 'opendatahub.io/dashboard=true,modelmesh-enabled' },
      },
    });
    expect(k8sListResourceMock).toHaveBeenNthCalledWith(2, {
      fetchOptions: { requestInit: {} },
      model: InferenceServiceModel,
      queryOptions: {
        ns: name,
        queryParams: { labelSelector },
      },
    });
    expect(k8sListResourceMock).toHaveBeenCalledTimes(2);
  });

  it('should handle errors and rethrows when failed to fetch inference service', async () => {
    const projectMock = mockProjectK8sResource({});
    const { name } = projectMock.metadata;
    k8sListResourceMock
      .mockResolvedValueOnce(mockK8sResourceList([projectMock]))
      .mockRejectedValueOnce(new Error('error'));
    await expect(listScopedInferenceService()).rejects.toThrow('error');
    expect(k8sListResourceMock).toHaveBeenNthCalledWith(1, {
      fetchOptions: { requestInit: {} },
      model: ProjectModel,
      queryOptions: {
        queryParams: { labelSelector: 'opendatahub.io/dashboard=true,modelmesh-enabled' },
      },
    });
    expect(k8sListResourceMock).toHaveBeenNthCalledWith(2, {
      fetchOptions: { requestInit: {} },
      model: InferenceServiceModel,
      queryOptions: { ns: name, queryParams: {} },
    });
    expect(k8sListResourceMock).toHaveBeenCalledTimes(2);
  });

  it('should handle errors and rethrows when failed to fetch project', async () => {
    k8sListResourceMock.mockRejectedValue(new Error('error'));
    await expect(listScopedInferenceService()).rejects.toThrow('error');
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceMock).toHaveBeenNthCalledWith(1, {
      fetchOptions: { requestInit: {} },
      model: ProjectModel,
      queryOptions: {
        queryParams: { labelSelector: 'opendatahub.io/dashboard=true,modelmesh-enabled' },
      },
    });
  });
});

describe('getInferenceServiceContext', () => {
  it('should successfully return inference service context when namespace is present', async () => {
    const inferenceServiceMock = mockInferenceServiceK8sResource({});
    const { namespace } = inferenceServiceMock.metadata;
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([inferenceServiceMock]));
    const result = await getInferenceServiceContext(namespace);
    expect(result).toStrictEqual([inferenceServiceMock]);
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: InferenceServiceModel,
      queryOptions: { ns: namespace, queryParams: {} },
    });
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
  });

  it('should successfully return inference service context when namespace is not present', async () => {
    const inferenceServiceMock = mockInferenceServiceK8sResource({});
    const { name } = inferenceServiceMock.metadata;
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([inferenceServiceMock]));
    const result = await getInferenceServiceContext();
    expect(result).toStrictEqual([inferenceServiceMock]);
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: InferenceServiceModel,
      queryOptions: { ns: name, queryParams: {} },
    });
    expect(k8sListResourceMock).toHaveBeenCalledTimes(2);
  });

  it('should handle errors and rethrows', async () => {
    k8sListResourceMock.mockRejectedValueOnce(new Error('error'));
    const name = 'test';
    await expect(getInferenceServiceContext(name)).rejects.toThrow('error');
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: InferenceServiceModel,
      queryOptions: { ns: name, queryParams: {} },
    });
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
  });
});

describe('getInferenceService', () => {
  it('should return specific inference service', async () => {
    const inferenceServiceMock = mockInferenceServiceK8sResource({});
    const { name, namespace } = inferenceServiceMock.metadata;
    k8sGetResourceMock.mockResolvedValue(inferenceServiceMock);
    const result = await getInferenceService(name, namespace);
    expect(result).toStrictEqual(inferenceServiceMock);
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: InferenceServiceModel,
      queryOptions: { name, ns: namespace, queryParams: {} },
    });
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
  });

  it('should handle errors and rethrows', async () => {
    k8sGetResourceMock.mockRejectedValueOnce(new Error('error'));
    const name = 'test';
    const namespace = 'test-project';
    await expect(getInferenceService(name, namespace)).rejects.toThrow('error');
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: InferenceServiceModel,
      queryOptions: { name, ns: namespace, queryParams: {} },
    });
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
  });
});

describe('createInferenceService', () => {
  const data = mockInferenceServiceModalData({});
  const inferenceServiceMock = assembleInferenceService(mockInferenceServiceModalData({}));
  it('should create inference service', async () => {
    k8sCreateResourceMock.mockResolvedValue(inferenceServiceMock);
    const result = await createInferenceService(data);
    expect(result).toStrictEqual(inferenceServiceMock);
    expect(k8sCreateResourceMock).toHaveBeenCalledWith(
      applyK8sAPIOptions(
        {
          model: InferenceServiceModel,
          resource: inferenceServiceMock,
        },
        {},
      ),
    );
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
  });

  it('should handle errors and rethrows', async () => {
    k8sCreateResourceMock.mockRejectedValueOnce(new Error('error'));
    await expect(createInferenceService(data)).rejects.toThrow('error');
    expect(k8sCreateResourceMock).toHaveBeenCalledWith(
      applyK8sAPIOptions(
        {
          model: InferenceServiceModel,
          resource: inferenceServiceMock,
        },
        {},
      ),
    );
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
  });
});

describe('updateInferenceService', () => {
  const data = mockInferenceServiceModalData({});
  const inferenceServiceMock = assembleInferenceService(mockInferenceServiceModalData({}));
  it('should update inference service', async () => {
    k8sUpdateResourceMock.mockResolvedValue(inferenceServiceMock);
    const result = await updateInferenceService(data, inferenceServiceMock);
    expect(result).toStrictEqual(inferenceServiceMock);
    expect(k8sUpdateResourceMock).toHaveBeenCalledWith(
      applyK8sAPIOptions(
        {
          model: InferenceServiceModel,
          resource: inferenceServiceMock,
        },
        {},
      ),
    );
    expect(k8sUpdateResourceMock).toHaveBeenCalledTimes(1);
  });

  it('should handle errors and rethrows', async () => {
    k8sUpdateResourceMock.mockRejectedValue(new Error('error'));
    await expect(updateInferenceService(data, inferenceServiceMock)).rejects.toThrow('error');
    expect(k8sUpdateResourceMock).toHaveBeenCalledWith(
      applyK8sAPIOptions(
        {
          model: InferenceServiceModel,
          resource: inferenceServiceMock,
        },
        {},
      ),
    );
    expect(k8sUpdateResourceMock).toHaveBeenCalledTimes(1);
  });
});

describe('project scoped hardware profile on inference service', () => {
  it('should correctly set project-scoped hardware profile annotations on inference service', () => {
    // Create an inference service with project-scoped hardware profile
    const inferenceService = mockInferenceServiceK8sResource({
      namespace: 'test-project',
      hardwareProfileName: 'large-profile-1',
      hardwareProfileNamespace: 'test-project',
    });

    // Verify the hardware profile annotations are set correctly
    expect(inferenceService.metadata.annotations).toBeDefined();
    expect(inferenceService.metadata.annotations?.['opendatahub.io/hardware-profile-name']).toBe(
      'large-profile-1',
    );
    expect(
      inferenceService.metadata.annotations?.['opendatahub.io/hardware-profile-namespace'],
    ).toBe('test-project');
  });

  it('should preserve hardware profile annotations when assembling inference service', () => {
    // Create a mock inference service with hardware profile annotations
    const existingInferenceService = mockInferenceServiceK8sResource({
      namespace: 'test-project',
      hardwareProfileName: 'large-profile-1',
      hardwareProfileNamespace: 'test-project',
    });

    // Assemble a new inference service based on the existing one
    const assembledInferenceService = assembleInferenceService(
      mockInferenceServiceModalData({}),
      undefined,
      undefined,
      false,
      existingInferenceService,
    );

    // Verify the hardware profile annotations are preserved
    expect(assembledInferenceService.metadata.annotations).toBeDefined();
    expect(
      assembledInferenceService.metadata.annotations?.['opendatahub.io/hardware-profile-name'],
    ).toBe('large-profile-1');
    expect(
      assembledInferenceService.metadata.annotations?.['opendatahub.io/hardware-profile-namespace'],
    ).toBe('test-project');
  });

  it('should update hardware profile annotations when using a different hardware profile', () => {
    // Create a mock inference service with hardware profile annotations
    const existingInferenceService = mockInferenceServiceK8sResource({
      namespace: 'test-project',
      hardwareProfileName: 'large-profile-1',
      hardwareProfileNamespace: 'test-project',
    });

    // Create a hardware profile to use in the pod spec options
    const hardwareProfile = mockHardwareProfile({
      name: 'small-profile',
      namespace: 'opendatahub',
      displayName: 'Small Profile',
    });

    // Create pod spec options with the new hardware profile
    const podSpecOptions = mockModelServingPodSpecOptions({
      selectedHardwareProfile: hardwareProfile,
    });

    // Assemble a new inference service with the new hardware profile
    const assembledInferenceService = assembleInferenceService(
      mockInferenceServiceModalData({}),
      undefined,
      undefined,
      false,
      existingInferenceService,
      undefined,
      podSpecOptions,
    );

    // Verify the hardware profile annotations are updated
    expect(assembledInferenceService.metadata.annotations).toBeDefined();
    expect(
      assembledInferenceService.metadata.annotations?.['opendatahub.io/hardware-profile-name'],
    ).toBe('small-profile');
    expect(
      assembledInferenceService.metadata.annotations?.['opendatahub.io/hardware-profile-namespace'],
    ).toBe('opendatahub');
  });
});

describe('deleteInferenceService', () => {
  const name = 'test';
  const namespace = 'test-project';
  it('should delete inference service successfully', async () => {
    const mockStatus = mock200Status({});
    k8sDeleteResourceMock.mockResolvedValue(mockStatus);
    const result = await deleteInferenceService(name, namespace);
    expect(result).toStrictEqual(mockStatus);
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      fetchOptions: {
        requestInit: {},
      },
      model: InferenceServiceModel,
      queryOptions: {
        name: 'test',
        ns: 'test-project',
        queryParams: {},
      },
    });
  });

  it('should return failure status when unsuccessful', async () => {
    const mockStatus = mock404Error({});
    k8sDeleteResourceMock.mockResolvedValue(mockStatus);
    const result = await deleteInferenceService(name, namespace);
    expect(result).toStrictEqual(mockStatus);
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      fetchOptions: {
        requestInit: {},
      },
      model: InferenceServiceModel,
      queryOptions: {
        name: 'test',
        ns: 'test-project',
        queryParams: {},
      },
    });
  });

  it('should handle errors and rethrows', async () => {
    k8sDeleteResourceMock.mockRejectedValue(new Error('error'));
    await expect(deleteInferenceService(name, namespace)).rejects.toThrow('error');

    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      fetchOptions: {
        requestInit: {},
      },
      model: InferenceServiceModel,
      queryOptions: {
        name: 'test',
        ns: 'test-project',
        queryParams: {},
      },
    });
  });
});

describe('assembleInferenceService - Preservation Tests', () => {
  it('should preserve existing metadata annotations when updating inference service', () => {
    const existingAnnotations = {
      'custom.annotation': 'custom-value',
      'another.annotation': 'another-value',
      'openshift.io/display-name': 'Original Display Name',
    };

    const existingInferenceService = mockInferenceServiceK8sResource({
      name: 'existing-service',
      namespace: 'test-project',
      displayName: 'Original Display Name',
    });
    existingInferenceService.metadata.annotations = {
      ...existingInferenceService.metadata.annotations,
      ...existingAnnotations,
    };

    const updateData = mockInferenceServiceModalData({
      name: 'Updated Display Name',
      k8sName: 'existing-service',
      project: 'test-project',
    });

    const result = assembleInferenceService(
      updateData,
      undefined,
      undefined,
      false,
      existingInferenceService,
    );

    // Should preserve existing custom annotations
    expect(result.metadata.annotations?.['custom.annotation']).toBe('custom-value');
    expect(result.metadata.annotations?.['another.annotation']).toBe('another-value');

    // Should update the display name
    expect(result.metadata.annotations?.['openshift.io/display-name']).toBe('Updated Display Name');

    // Should add new required annotations
    expect(result.metadata.annotations?.['serving.kserve.io/deploymentMode']).toBeDefined();
  });

  it('should preserve existing metadata labels when updating inference service', () => {
    const existingLabels = {
      'custom.label': 'custom-value',
      'another.label': 'another-value',
      team: 'ml-team',
    };

    const existingInferenceService = mockInferenceServiceK8sResource({
      name: 'existing-isvc',
      namespace: 'test-project',
      additionalLabels: existingLabels,
    });

    const updateData = mockInferenceServiceModalData({
      name: 'Updated ISVC',
      k8sName: 'existing-isvc',
      project: 'test-project',
      labels: {
        'new.label': 'new-value',
      },
    });

    const result = assembleInferenceService(
      updateData,
      undefined,
      undefined,
      false,
      existingInferenceService,
    );

    // Should preserve existing custom labels
    expect(result.metadata.labels?.['custom.label']).toBe('custom-value');
    expect(result.metadata.labels?.['another.label']).toBe('another-value');
    expect(result.metadata.labels?.team).toBe('ml-team');

    // Should add new labels from update data
    expect(result.metadata.labels?.['new.label']).toBe('new-value');

    // Should always have dashboard resource label
    expect(result.metadata.labels?.[KnownLabels.DASHBOARD_RESOURCE]).toBe('true');
  });

  it('should preserve existing spec.predictor.metadata properties when updating inference service', () => {
    const existingInferenceService = mockInferenceServiceK8sResource({
      name: 'existing-isvc',
      namespace: 'test-project',
      minReplicas: 2,
      maxReplicas: 5,
      predictorAnnotations: {
        'serving.knative.dev/progress-deadline': '30m',
      },
    });

    const updateData = mockInferenceServiceModalData({
      name: 'Updated Service',
      k8sName: 'existing-isvc',
      project: 'test-project',
      minReplicas: 3,
      maxReplicas: 7,
    });

    const result = assembleInferenceService(
      updateData,
      undefined,
      undefined,
      false, // KServe mode
      existingInferenceService,
    );

    // Should update replica counts
    expect(result.spec.predictor.minReplicas).toBe(3);
    expect(result.spec.predictor.maxReplicas).toBe(7);

    // Should preserve existing predictor annotations
    expect(result.spec.predictor.annotations).toEqual({
      'serving.knative.dev/progress-deadline': '30m',
    });
  });

  it('should replace existing spec.predictor.model.storage when updating with URI storage', () => {
    const existingInferenceService = mockInferenceServiceK8sResource({
      name: 'existing-service',
      namespace: 'test-project',
      path: '/existing/path',
    });

    const updateData = mockInferenceServiceModalData({
      name: 'Updated Service',
      k8sName: 'existing-service',
      project: 'test-project',
      storage: {
        ...mockInferenceServiceModalData({}).storage,
        uri: 's3://bucket/new-model',
      },
    });

    const result = assembleInferenceService(
      updateData,
      undefined,
      undefined,
      false,
      existingInferenceService,
    );

    // Should switch to URI storage
    expect(result.spec.predictor.model?.storageUri).toBe('s3://bucket/new-model');
    expect(result.spec.predictor.model?.storage).toBeUndefined();
  });

  it('should update existing spec.predictor.model.storage when updating with storage path', () => {
    const existingInferenceService = mockInferenceServiceK8sResource({
      name: 'existing-service',
      namespace: 'test-project',
      path: '/existing/path',
    });

    const updateData = mockInferenceServiceModalData({
      name: 'Updated Service',
      k8sName: 'existing-service',
      project: 'test-project',
      storage: {
        ...mockInferenceServiceModalData({}).storage,
        path: '/new/path',
        dataConnection: 'new-connection',
      },
    });

    const result = assembleInferenceService(
      updateData,
      undefined,
      undefined,
      false,
      existingInferenceService,
    );

    // Should update storage path and connection
    expect(result.spec.predictor.model?.storageUri).toBeUndefined();
    expect(result.spec.predictor.model?.storage).toEqual({
      key: 'new-connection',
      path: '/new/path',
    });
  });

  it('should preserve existing spec.predictor.model.resources.claims when updating with podSpecOptions', () => {
    const existingResources = {
      requests: {
        cpu: '500m',
        memory: '1Gi',
      },
      limits: {
        cpu: '1000m',
        memory: '2Gi',
      },
      claims: [
        {
          name: 'existing-claim',
        },
      ],
    };

    const existingInferenceService = mockInferenceServiceK8sResource({
      name: 'existing-service',
      namespace: 'test-project',
      resources: existingResources,
    });

    const podSpecOptions = mockModelServingPodSpecOptions({
      resources: {
        requests: {
          cpu: '5000m',
          memory: '2Gi',
          'nvidia.com/gpu': 1,
        },
        limits: {
          cpu: '10000m',
          memory: '20Gi',
          'nvidia.com/gpu': 1,
        },
      },
    });

    const updateData = mockInferenceServiceModalData({
      name: 'Updated Service',
      k8sName: 'existing-service',
      project: 'test-project',
    });

    const result = assembleInferenceService(
      updateData,
      undefined,
      undefined,
      false,
      existingInferenceService,
      undefined,
      podSpecOptions,
    );

    // Should merge existing and new resources
    expect(result.spec.predictor.model?.resources).toEqual({
      requests: {
        cpu: '5000m',
        memory: '2Gi',
        'nvidia.com/gpu': 1,
      },
      limits: {
        cpu: '10000m',
        memory: '20Gi',
        'nvidia.com/gpu': 1,
      },
      claims: [
        {
          name: 'existing-claim',
        },
      ],
    });
  });
});
