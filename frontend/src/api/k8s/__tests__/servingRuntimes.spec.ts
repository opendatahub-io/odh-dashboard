import {
  K8sStatus,
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { mock200Status, mock404Error } from '#~/__mocks__/mockK8sStatus';
import { mockModelServingPodSpecOptions } from '#~/__mocks__/mockModelServingPodSpecOptions';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import { mockServingRuntimeK8sResource } from '#~/__mocks__/mockServingRuntimeK8sResource';
import { mockServingRuntimeModalData } from '#~/__mocks__/mockServingRuntimeModalData';
import { mockServingRuntimeTemplateK8sResource } from '#~/__mocks__/mockServingRuntimeTemplateK8sResource';
import { mockHardwareProfile } from '#~/__mocks__/mockHardwareProfile';
import {
  assembleServingRuntime,
  createServingRuntime,
  deleteServingRuntime,
  getServingRuntime,
  getServingRuntimeContext,
  listScopedServingRuntimes,
  listServingRuntimes,
  updateServingRuntime,
} from '#~/api/k8s/servingRuntimes';
import { ProjectModel, ServingRuntimeModel } from '#~/api/models';
import { ModelServingPodSpecOptions } from '#~/concepts/hardwareProfiles/useModelServingPodSpecOptionsState';
import { TolerationOperator, TolerationEffect } from '#~/types';
import { ProjectKind, ServingRuntimeKind } from '#~/k8sTypes';

global.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
  k8sGetResource: jest.fn(),
  k8sUpdateResource: jest.fn(),
  k8sCreateResource: jest.fn(),
  k8sDeleteResource: jest.fn(),
}));

const k8sListResourceMock = jest.mocked(k8sListResource<ServingRuntimeKind | ProjectKind>);
const k8sGetResourceMock = jest.mocked(k8sGetResource<ServingRuntimeKind>);
const k8sUpdateResourceMock = jest.mocked(k8sUpdateResource<ServingRuntimeKind>);
const k8sCreateResourceMock = jest.mocked(k8sCreateResource<ServingRuntimeKind>);
const k8sDeleteResourceMock = jest.mocked(k8sDeleteResource<ServingRuntimeKind, K8sStatus>);
describe('assembleServingRuntime', () => {
  it('should omit enable-xxxx annotations when creating', async () => {
    const servingRuntime = assembleServingRuntime(
      mockServingRuntimeModalData({
        externalRoute: false,
        tokenAuth: false,
      }),
      'test',
      mockServingRuntimeTemplateK8sResource({}).objects[0] as ServingRuntimeKind,
      false,
      mockModelServingPodSpecOptions({}),
      false, // isEditing
    );

    expect(servingRuntime.metadata.annotations).toBeDefined();
    expect(servingRuntime.metadata.annotations?.['enable-auth']).toBe(undefined);
    expect(servingRuntime.metadata.annotations?.['enable-route']).toBe(undefined);
  });

  it('should remove enable-xxxx annotations when editing', async () => {
    const servingRuntime = assembleServingRuntime(
      mockServingRuntimeModalData({
        externalRoute: false,
        tokenAuth: false,
      }),
      'test',
      mockServingRuntimeK8sResource({ auth: true, route: true }),
      false,
      mockModelServingPodSpecOptions({}),
      true, // isEditing
    );

    expect(servingRuntime.metadata.annotations).toBeDefined();
    expect(servingRuntime.metadata.annotations?.['enable-auth']).toBe(undefined);
    expect(servingRuntime.metadata.annotations?.['enable-route']).toBe(undefined);
  });

  it('should add enable-xxxx annotations when creating', async () => {
    const servingRuntime = assembleServingRuntime(
      mockServingRuntimeModalData({
        externalRoute: true,
        tokenAuth: true,
      }),
      'test',
      mockServingRuntimeTemplateK8sResource({}).objects[0] as ServingRuntimeKind,
      false,
      mockModelServingPodSpecOptions({}),
      false, // isEditing
    );

    expect(servingRuntime.metadata.annotations).toBeDefined();
    expect(servingRuntime.metadata.annotations?.['enable-auth']).toBe('true');
    expect(servingRuntime.metadata.annotations?.['enable-route']).toBe('true');
  });

  it('should add enable-xxxx annotations when editing', async () => {
    const servingRuntime = assembleServingRuntime(
      mockServingRuntimeModalData({
        externalRoute: true,
        tokenAuth: true,
      }),
      'test',
      mockServingRuntimeK8sResource({ auth: false, route: false }),
      false,
      mockModelServingPodSpecOptions({}),
      true, // isEditing
    );

    expect(servingRuntime.metadata.annotations).toBeDefined();
    expect(servingRuntime.metadata.annotations?.['enable-auth']).toBe('true');
    expect(servingRuntime.metadata.annotations?.['enable-route']).toBe('true');
  });

  it('should not add tolerations and gpu on kserve', async () => {
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

    const servingRuntime = assembleServingRuntime(
      mockServingRuntimeModalData({
        externalRoute: true,
        tokenAuth: true,
      }),
      'test',
      mockServingRuntimeK8sResource({ auth: false, route: false }),
      true,
      podSpecOption,
      false,
    );

    expect(servingRuntime.spec.tolerations).toBeUndefined();
    expect(servingRuntime.spec.containers[0].resources?.limits?.['nvidia.com/gpu']).toBeUndefined();
    expect(
      servingRuntime.spec.containers[0].resources?.requests?.['nvidia.com/gpu'],
    ).toBeUndefined();
  });

  it('should not set hardware profile annotation for real profiles', () => {
    const hardwareProfile = mockHardwareProfile({ name: 'real-profile' });
    hardwareProfile.metadata.uid = 'test-uid';
    const podSpecOptions = mockModelServingPodSpecOptions({
      selectedHardwareProfile: hardwareProfile,
    });
    const result = assembleServingRuntime(
      mockServingRuntimeModalData({}),
      'test-ns',
      mockServingRuntimeK8sResource({}),
      true,
      podSpecOptions,
      false,
    );
    expect(result.metadata.annotations?.['opendatahub.io/hardware-profile-name']).toBeUndefined();
  });
});

describe('listServingRuntimes', () => {
  it('should list serving runtimes', async () => {
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([mockServingRuntimeK8sResource({})]));
    const result = await listServingRuntimes();
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ServingRuntimeModel,
      queryOptions: { queryParams: {} },
    });
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual([mockServingRuntimeK8sResource({})]);
  });

  it('should list serving runtimes with namespace and label selector', async () => {
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([mockServingRuntimeK8sResource({})]));
    const result = await listServingRuntimes('namespace', 'labelselector');
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ServingRuntimeModel,
      queryOptions: { ns: 'namespace', queryParams: { labelSelector: 'labelselector' } },
    });
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual([mockServingRuntimeK8sResource({})]);
  });

  it('should handle errors and rethrow', async () => {
    k8sListResourceMock.mockRejectedValue(new Error('error1'));
    await expect(listServingRuntimes('namespace', 'labelselector')).rejects.toThrow('error1');
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ServingRuntimeModel,
      queryOptions: { ns: 'namespace', queryParams: { labelSelector: 'labelselector' } },
    });
  });
});

describe('listScopedServingRuntimes', () => {
  it('should return list scoped serving runtimes with no label selector', async () => {
    const mock = mockServingRuntimeK8sResource({});
    k8sListResourceMock
      .mockResolvedValueOnce(
        mockK8sResourceList([mockProjectK8sResource({ k8sName: mock.metadata.name })]),
      )
      .mockResolvedValueOnce(mockK8sResourceList([mock]));
    const result = await listScopedServingRuntimes();
    expect(result).toStrictEqual([mock]);
    expect(k8sListResourceMock).toHaveBeenNthCalledWith(1, {
      fetchOptions: { requestInit: {} },
      model: ProjectModel,
      queryOptions: {
        queryParams: { labelSelector: 'opendatahub.io/dashboard=true,modelmesh-enabled' },
      },
    });
    expect(k8sListResourceMock).toHaveBeenNthCalledWith(2, {
      fetchOptions: { requestInit: {} },
      model: ServingRuntimeModel,
      queryOptions: { ns: 'test-model', queryParams: {} },
    });
    expect(k8sListResourceMock).toHaveBeenCalledTimes(2);
  });
  it('should return list scoped serving runtimes with label selector', async () => {
    const inferenceServiceMock = mockServingRuntimeK8sResource({});
    const { name } = inferenceServiceMock.metadata;
    k8sListResourceMock
      .mockResolvedValueOnce(mockK8sResourceList([mockProjectK8sResource({ k8sName: name })]))
      .mockResolvedValueOnce(mockK8sResourceList([inferenceServiceMock]));
    const result = await listScopedServingRuntimes('labelSelector');
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
      model: ServingRuntimeModel,
      queryOptions: { ns: 'test-model', queryParams: { labelSelector: 'labelSelector' } },
    });
    expect(k8sListResourceMock).toHaveBeenCalledTimes(2);
  });

  it('should handle errors and rethrows when failed to fetch serving runtimes', async () => {
    const projectMock = mockProjectK8sResource({});
    k8sListResourceMock
      .mockResolvedValueOnce(mockK8sResourceList([projectMock]))
      .mockRejectedValueOnce(new Error('error'));
    await expect(listScopedServingRuntimes('labelSelector')).rejects.toThrow('error');
    expect(k8sListResourceMock).toHaveBeenNthCalledWith(1, {
      fetchOptions: { requestInit: {} },
      model: ProjectModel,
      queryOptions: {
        queryParams: { labelSelector: 'opendatahub.io/dashboard=true,modelmesh-enabled' },
      },
    });
    expect(k8sListResourceMock).toHaveBeenNthCalledWith(2, {
      fetchOptions: { requestInit: {} },
      model: ServingRuntimeModel,
      queryOptions: { ns: 'test-project', queryParams: { labelSelector: 'labelSelector' } },
    });
    expect(k8sListResourceMock).toHaveBeenCalledTimes(2);
  });

  it('should handle errors and rethrows when failed to fetch project', async () => {
    k8sListResourceMock.mockRejectedValue(new Error('error'));
    await expect(listScopedServingRuntimes('labelSelector')).rejects.toThrow('error');
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

describe('getServingRuntimeContext', () => {
  it('should return serving runtime context with namespace', async () => {
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([mockServingRuntimeK8sResource({})]));
    const result = await getServingRuntimeContext('namespace', 'labelSelector');
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ServingRuntimeModel,
      queryOptions: { ns: 'namespace', queryParams: { labelSelector: 'labelSelector' } },
    });
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual([mockServingRuntimeK8sResource({})]);
  });

  it('should return serving runtime context without namespace', async () => {
    const mock = mockServingRuntimeK8sResource({});
    k8sListResourceMock
      .mockResolvedValueOnce(
        mockK8sResourceList([mockProjectK8sResource({ k8sName: mock.metadata.name })]),
      )
      .mockResolvedValueOnce(mockK8sResourceList([mock]));
    const result = await getServingRuntimeContext();
    expect(k8sListResourceMock).toHaveBeenNthCalledWith(1, {
      fetchOptions: { requestInit: {} },
      model: ProjectModel,
      queryOptions: {
        queryParams: { labelSelector: 'opendatahub.io/dashboard=true,modelmesh-enabled' },
      },
    });
    expect(k8sListResourceMock).toHaveBeenNthCalledWith(2, {
      fetchOptions: { requestInit: {} },
      model: ServingRuntimeModel,
      queryOptions: { ns: 'test-model', queryParams: {} },
    });
    expect(k8sListResourceMock).toHaveBeenCalledTimes(2);
    expect(result).toStrictEqual([mockServingRuntimeK8sResource({})]);
  });

  it('should handle errors and rethrows when failed to fetch inference service', async () => {
    k8sListResourceMock
      .mockResolvedValueOnce(mockK8sResourceList([mockProjectK8sResource({})]))
      .mockRejectedValueOnce(new Error('error'));
    await expect(getServingRuntimeContext()).rejects.toThrow('error');
    expect(k8sListResourceMock).toHaveBeenNthCalledWith(1, {
      fetchOptions: { requestInit: {} },
      model: ProjectModel,
      queryOptions: {
        queryParams: { labelSelector: 'opendatahub.io/dashboard=true,modelmesh-enabled' },
      },
    });
    expect(k8sListResourceMock).toHaveBeenNthCalledWith(2, {
      fetchOptions: { requestInit: {} },
      model: ServingRuntimeModel,
      queryOptions: { ns: 'test-project', queryParams: {} },
    });
    expect(k8sListResourceMock).toHaveBeenCalledTimes(2);
  });

  it('should handle errors and rethrow', async () => {
    k8sListResourceMock.mockRejectedValue(new Error('error1'));
    await expect(getServingRuntimeContext('namespace', 'labelSelector')).rejects.toThrow('error1');
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ServingRuntimeModel,
      queryOptions: { ns: 'namespace', queryParams: { labelSelector: 'labelSelector' } },
    });
  });
});

describe('getServingRuntime', () => {
  it('should list serving runtimes', async () => {
    k8sGetResourceMock.mockResolvedValue(mockServingRuntimeK8sResource({}));
    const result = await getServingRuntime('name', 'namespace');
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ServingRuntimeModel,
      queryOptions: { name: 'name', ns: 'namespace', queryParams: {} },
    });
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(mockServingRuntimeK8sResource({}));
  });
  it('should handle errors and rethrow', async () => {
    k8sGetResourceMock.mockRejectedValue(new Error('error1'));
    await expect(getServingRuntime('name', 'namespace')).rejects.toThrow('error1');
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ServingRuntimeModel,
      queryOptions: { name: 'name', ns: 'namespace', queryParams: {} },
    });
  });
});

describe('updateServingRuntime', () => {
  const existingData = assembleServingRuntime(
    mockServingRuntimeModalData({}),
    'test',
    mockServingRuntimeK8sResource({}),
    true,
    mockModelServingPodSpecOptions({}),
    false,
  );
  it('should update serving runtimes when isCustomServingRuntimesEnabled is false', async () => {
    const option = {
      data: mockServingRuntimeModalData({}),
      existingData,
      isCustomServingRuntimesEnabled: false,
      podSpecOptions: mockModelServingPodSpecOptions({}),
    };
    k8sUpdateResourceMock.mockResolvedValue(mockServingRuntimeK8sResource({}));
    const result = await updateServingRuntime(option);
    expect(k8sUpdateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ServingRuntimeModel,
      queryOptions: { queryParams: {} },
      resource: existingData,
    });
    expect(k8sUpdateResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(mockServingRuntimeK8sResource({}));
  });

  it('should update serving runtimes when isCustomServingRuntimesEnabled is true', async () => {
    const option = {
      data: mockServingRuntimeModalData({}),
      existingData,
      isCustomServingRuntimesEnabled: true,
      podSpecOptions: mockModelServingPodSpecOptions({}),
    };
    k8sUpdateResourceMock.mockResolvedValue(mockServingRuntimeK8sResource({}));
    const result = await updateServingRuntime(option);
    expect(k8sUpdateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ServingRuntimeModel,
      queryOptions: { queryParams: {} },
      resource: existingData,
    });
    expect(k8sUpdateResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(mockServingRuntimeK8sResource({}));
  });

  it('should handle errors and rethrow', async () => {
    const option = {
      data: mockServingRuntimeModalData({}),
      existingData,
      isCustomServingRuntimesEnabled: true,
      podSpecOptions: mockModelServingPodSpecOptions({}),
    };
    k8sUpdateResourceMock.mockRejectedValue(new Error('error1'));
    await expect(updateServingRuntime(option)).rejects.toThrow('error1');
    expect(k8sUpdateResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sUpdateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ServingRuntimeModel,
      queryOptions: { queryParams: {} },
      resource: existingData,
    });
  });
});

describe('createServingRuntime', () => {
  const MocksevingRuntime = mockServingRuntimeK8sResource({
    auth: false,
    route: false,
    displayName: 'My Inference Service',
    name: 'my-inference-service-test',
  });
  const existingData = assembleServingRuntime(
    mockServingRuntimeModalData({}),
    'test',
    MocksevingRuntime,
    true,
    mockModelServingPodSpecOptions({}),
    false,
  );
  it('should create serving runtimes when isCustomServingRuntimesEnabled is false', async () => {
    const option = {
      data: mockServingRuntimeModalData({}),
      namespace: 'test',
      servingRuntime: existingData,
      isCustomServingRuntimesEnabled: false,
      podSpecOptions: mockModelServingPodSpecOptions({}),
    };
    k8sCreateResourceMock.mockResolvedValue(mockServingRuntimeK8sResource({}));
    const result = await createServingRuntime(option);
    expect(k8sCreateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ServingRuntimeModel,
      queryOptions: { queryParams: {} },
      resource: {
        ...existingData,
        metadata: { ...existingData.metadata, name: 'model-server-test' },
      },
    });
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(mockServingRuntimeK8sResource({}));
  });

  it('should create serving runtimes when isCustomServingRuntimesEnabled is true', async () => {
    const option = {
      data: mockServingRuntimeModalData({}),
      namespace: 'test',
      servingRuntime: existingData,
      isCustomServingRuntimesEnabled: true,
      podSpecOptions: mockModelServingPodSpecOptions({}),
    };
    k8sCreateResourceMock.mockResolvedValue(mockServingRuntimeK8sResource({}));
    const result = await createServingRuntime(option);
    expect(k8sCreateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ServingRuntimeModel,
      queryOptions: { queryParams: {} },
      resource: existingData,
    });
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(mockServingRuntimeK8sResource({}));
  });
  it('should handle errors and rethrow', async () => {
    const option = {
      data: mockServingRuntimeModalData({}),
      namespace: 'test',
      servingRuntime: existingData,
      isCustomServingRuntimesEnabled: true,
      podSpecOptions: mockModelServingPodSpecOptions({}),
    };
    k8sCreateResourceMock.mockRejectedValue(new Error('error1'));
    await expect(createServingRuntime(option)).rejects.toThrow('error1');
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sCreateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ServingRuntimeModel,
      queryOptions: { queryParams: {} },
      resource: existingData,
    });
  });
});

describe('deleteServingRuntime', () => {
  it('should return status as Success', async () => {
    const mockK8sStatus = mock200Status({});
    k8sDeleteResourceMock.mockResolvedValue(mockK8sStatus);
    const result = await deleteServingRuntime('name', 'namespace');
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ServingRuntimeModel,
      queryOptions: { name: 'name', ns: 'namespace', queryParams: {} },
    });
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(mockK8sStatus);
  });

  it('should return status as Failure', async () => {
    const mockK8sStatus = mock404Error({});
    k8sDeleteResourceMock.mockResolvedValue(mockK8sStatus);
    const result = await deleteServingRuntime('name', 'namespace');
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ServingRuntimeModel,
      queryOptions: { name: 'name', ns: 'namespace', queryParams: {} },
    });
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(mockK8sStatus);
  });

  it('should handle errors and rethrow', async () => {
    k8sDeleteResourceMock.mockRejectedValue(new Error('error1'));
    await expect(deleteServingRuntime('name', 'namespace')).rejects.toThrow('error1');
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ServingRuntimeModel,
      queryOptions: { name: 'name', ns: 'namespace', queryParams: {} },
    });
  });
});
