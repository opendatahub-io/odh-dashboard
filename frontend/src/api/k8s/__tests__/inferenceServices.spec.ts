import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  K8sStatus,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { mockAcceleratorProfile } from '~/__mocks__/mockAcceleratorProfile';
import { mockInferenceServiceK8sResource } from '~/__mocks__/mockInferenceServiceK8sResource';
import { mockInferenceServiceModalData } from '~/__mocks__/mockInferenceServiceModalData';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mock200Status, mock404Error } from '~/__mocks__/mockK8sStatus';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { applyK8sAPIOptions } from '~/api/apiMergeUtils';
import {
  assembleInferenceService,
  createInferenceService,
  deleteInferenceService,
  getInferenceService,
  getInferenceServiceContext,
  listInferenceService,
  listScopedInferenceService,
  updateInferenceService,
} from '~/api/k8s/inferenceServices';
import { InferenceServiceModel, ProjectModel } from '~/api/models';
import { InferenceServiceKind, ProjectKind } from '~/k8sTypes';
import { ModelServingSize } from '~/pages/modelServing/screens/types';
import { AcceleratorProfileFormData } from '~/utilities/useAcceleratorProfileFormState';
import { AcceleratorProfileState } from '~/utilities/useReadAcceleratorState';

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
      undefined,
    );
    expect(inferenceService.metadata.annotations?.['security.opendatahub.io/enable-auth']).toBe(
      undefined,
    );
    expect(
      inferenceService.metadata.annotations?.['serving.knative.openshift.io/enablePassthrough'],
    ).toBe('true');
    expect(inferenceService.metadata.annotations?.['sidecar.istio.io/inject']).toBe('true');
    expect(inferenceService.metadata.annotations?.['sidecar.istio.io/rewriteAppHTTPProbers']).toBe(
      'true',
    );
  });

  it('should have the right annotations when creating for Kserve with auth', async () => {
    const inferenceService = assembleInferenceService(
      mockInferenceServiceModalData({ tokenAuth: true }),
    );

    expect(inferenceService.metadata.annotations).toBeDefined();
    expect(inferenceService.metadata.annotations?.['serving.kserve.io/deploymentMode']).toBe(
      undefined,
    );
    expect(inferenceService.metadata.annotations?.['security.opendatahub.io/enable-auth']).toBe(
      'true',
    );
    expect(
      inferenceService.metadata.annotations?.['serving.knative.openshift.io/enablePassthrough'],
    ).toBe('true');
    expect(inferenceService.metadata.annotations?.['sidecar.istio.io/inject']).toBe('true');
    expect(inferenceService.metadata.annotations?.['sidecar.istio.io/rewriteAppHTTPProbers']).toBe(
      'true',
    );
  });

  it('should have the right annotations when creating for modelmesh', async () => {
    const inferenceService = assembleInferenceService(
      mockInferenceServiceModalData({}),
      undefined,
      undefined,
      true,
    );

    expect(inferenceService.metadata.annotations).toBeDefined();
    expect(inferenceService.metadata.annotations?.['serving.kserve.io/deploymentMode']).toBe(
      'ModelMesh',
    );
    expect(
      inferenceService.metadata.annotations?.['serving.knative.openshift.io/enablePassthrough'],
    ).toBe(undefined);
    expect(inferenceService.metadata.annotations?.['sidecar.istio.io/inject']).toBe(undefined);
    expect(inferenceService.metadata.annotations?.['sidecar.istio.io/rewriteAppHTTPProbers']).toBe(
      undefined,
    );
  });

  it('should have the right labels when creating for Kserve with public route', async () => {
    const inferenceService = assembleInferenceService(
      mockInferenceServiceModalData({ externalRoute: false }),
    );

    expect(inferenceService.metadata.labels?.['networking.knative.dev/visibility']).toBe(
      'cluster-local',
    );

    const missingExternalRoute = assembleInferenceService(
      mockInferenceServiceModalData({ externalRoute: true }),
    );

    expect(missingExternalRoute.metadata.labels?.['networking.knative.dev/visibility']).toBe(
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

  it('should add accelerator if kserve and accelerator found', async () => {
    const acceleratorProfileState: AcceleratorProfileState = {
      acceleratorProfile: mockAcceleratorProfile({}),
      acceleratorProfiles: [mockAcceleratorProfile({})],
      count: 1,
      unknownProfileDetected: false,
    };

    const selectedAcceleratorProfile: AcceleratorProfileFormData = {
      profile: mockAcceleratorProfile({}),
      count: 1,
      useExistingSettings: false,
    };

    const inferenceService = assembleInferenceService(
      mockInferenceServiceModalData({}),
      undefined,
      undefined,
      false,
      undefined,
      undefined,
      acceleratorProfileState,
      selectedAcceleratorProfile,
    );

    expect(inferenceService.spec.predictor.tolerations).toBeDefined();
    expect(inferenceService.spec.predictor.tolerations?.[0].key).toBe(
      mockAcceleratorProfile({}).spec.tolerations?.[0].key,
    );
    expect(inferenceService.spec.predictor.model?.resources?.limits?.['nvidia.com/gpu']).toBe(1);
    expect(inferenceService.spec.predictor.model?.resources?.requests?.['nvidia.com/gpu']).toBe(1);
  });

  it('should not add accelerator if modelmesh and accelerator found', async () => {
    const acceleratorProfileState: AcceleratorProfileState = {
      acceleratorProfile: mockAcceleratorProfile({}),
      acceleratorProfiles: [mockAcceleratorProfile({})],
      count: 1,
      unknownProfileDetected: false,
    };

    const selectedAcceleratorProfile: AcceleratorProfileFormData = {
      profile: mockAcceleratorProfile({}),
      count: 1,
      useExistingSettings: false,
    };

    const inferenceService = assembleInferenceService(
      mockInferenceServiceModalData({}),
      undefined,
      undefined,
      true,
      undefined,
      undefined,
      acceleratorProfileState,
      selectedAcceleratorProfile,
    );

    expect(inferenceService.spec.predictor.tolerations).toBeUndefined();
    expect(inferenceService.spec.predictor.model?.resources).toBeUndefined();
  });

  it('should provide max and min replicas if provided', async () => {
    const replicaCount = 2;

    const acceleratorProfileState: AcceleratorProfileState = {
      acceleratorProfile: mockAcceleratorProfile({}),
      acceleratorProfiles: [mockAcceleratorProfile({})],
      count: 1,
      unknownProfileDetected: false,
    };

    const selectedAcceleratorProfile: AcceleratorProfileFormData = {
      profile: mockAcceleratorProfile({}),
      count: 1,
      useExistingSettings: false,
    };

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
      acceleratorProfileState,
      selectedAcceleratorProfile,
    );

    expect(inferenceService.spec.predictor.maxReplicas).toBe(replicaCount);
    expect(inferenceService.spec.predictor.minReplicas).toBe(replicaCount);
  });

  it('should omit replica count for modelmesh', async () => {
    const acceleratorProfileState: AcceleratorProfileState = {
      acceleratorProfile: mockAcceleratorProfile({}),
      acceleratorProfiles: [mockAcceleratorProfile({})],
      count: 1,
      unknownProfileDetected: false,
    };

    const selectedAcceleratorProfile: AcceleratorProfileFormData = {
      profile: mockAcceleratorProfile({}),
      count: 1,
      useExistingSettings: false,
    };

    const inferenceService = assembleInferenceService(
      mockInferenceServiceModalData({}),
      undefined,
      undefined,
      true,
      undefined,
      undefined,
      acceleratorProfileState,
      selectedAcceleratorProfile,
    );

    expect(inferenceService.spec.predictor.maxReplicas).toBeUndefined();
    expect(inferenceService.spec.predictor.minReplicas).toBeUndefined();
  });

  it('should add requests on kserve', async () => {
    const acceleratorProfileState: AcceleratorProfileState = {
      acceleratorProfile: mockAcceleratorProfile({}),
      acceleratorProfiles: [mockAcceleratorProfile({})],
      count: 1,
      unknownProfileDetected: false,
    };

    const selectedAcceleratorProfile: AcceleratorProfileFormData = {
      profile: mockAcceleratorProfile({}),
      count: 1,
      useExistingSettings: false,
    };

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
      mockInferenceServiceModalData({ modelSize }),
      undefined,
      undefined,
      false,
      undefined,
      undefined,
      acceleratorProfileState,
      selectedAcceleratorProfile,
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

  it('should omit requests on modelmesh', async () => {
    const acceleratorProfileState: AcceleratorProfileState = {
      acceleratorProfile: mockAcceleratorProfile({}),
      acceleratorProfiles: [mockAcceleratorProfile({})],
      count: 1,
      unknownProfileDetected: false,
    };

    const selectedAcceleratorProfile: AcceleratorProfileFormData = {
      profile: mockAcceleratorProfile({}),
      count: 1,
      useExistingSettings: false,
    };

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
      mockInferenceServiceModalData({ modelSize }),
      undefined,
      undefined,
      true,
      undefined,
      undefined,
      acceleratorProfileState,
      selectedAcceleratorProfile,
    );

    expect(inferenceService.spec.predictor.model?.resources).toBeUndefined();
  });

  it('should have base annotations for kserve raw', async () => {
    const inferenceService = assembleInferenceService(
      mockInferenceServiceModalData({ isKServeRawDeployment: true }),
    );
    const { annotations, labels } = inferenceService.metadata;

    expect(annotations?.['serving.kserve.io/deploymentMode']).toBe('RawDeployment');

    expect(annotations?.['serving.knative.openshift.io/enablePassthrough']).toBe(undefined);
    expect(annotations?.['sidecar.istio.io/inject']).toBe(undefined);
    expect(annotations?.['sidecar.istio.io/rewriteAppHTTPProbers']).toBe(undefined);
    expect(annotations?.['security.opendatahub.io/enable-auth']).toBe(undefined);
    expect(labels?.['security.opendatahub.io/enable-auth']).toBe(undefined);
    expect(labels?.['networking.kserve.io/visibility']).toBe(undefined);
    expect(labels?.['networking.knative.dev/visibility']).toBe(undefined);
  });

  it('should have correct auth and routing for kserve raw', async () => {
    const ext = assembleInferenceService(
      mockInferenceServiceModalData({ isKServeRawDeployment: true, externalRoute: true }),
    );
    expect(ext.metadata.annotations?.['serving.kserve.io/deploymentMode']).toBe('RawDeployment');
    expect(ext.metadata.annotations?.['security.opendatahub.io/enable-auth']).toBe(undefined);
    expect(ext.metadata.labels?.['security.opendatahub.io/enable-auth']).toBe(undefined);
    expect(ext.metadata.labels?.['networking.kserve.io/visibility']).toBe('exposed');
    expect(ext.metadata.labels?.['networking.knative.dev/visibility']).toBe(undefined);

    const auth = assembleInferenceService(
      mockInferenceServiceModalData({ isKServeRawDeployment: true, tokenAuth: true }),
    );
    expect(auth.metadata.annotations?.['serving.kserve.io/deploymentMode']).toBe('RawDeployment');
    expect(auth.metadata.annotations?.['security.opendatahub.io/enable-auth']).toBe(undefined);
    expect(auth.metadata.labels?.['security.opendatahub.io/enable-auth']).toBe('true');
    expect(auth.metadata.labels?.['networking.kserve.io/visibility']).toBe(undefined);
    expect(auth.metadata.labels?.['networking.knative.dev/visibility']).toBe(undefined);

    const both = assembleInferenceService(
      mockInferenceServiceModalData({
        isKServeRawDeployment: true,
        externalRoute: true,
        tokenAuth: true,
      }),
    );
    expect(both.metadata.annotations?.['serving.kserve.io/deploymentMode']).toBe('RawDeployment');
    expect(both.metadata.annotations?.['security.opendatahub.io/enable-auth']).toBe(undefined);
    expect(both.metadata.labels?.['security.opendatahub.io/enable-auth']).toBe('true');
    expect(both.metadata.labels?.['networking.kserve.io/visibility']).toBe('exposed');
    expect(both.metadata.labels?.['networking.knative.dev/visibility']).toBe(undefined);
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
