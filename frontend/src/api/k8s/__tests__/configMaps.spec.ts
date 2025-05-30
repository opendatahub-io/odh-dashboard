import {
  K8sStatus,
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { mockConfigMap } from '#~/__mocks__/mockConfigMap';
import { mock200Status, mock404Error } from '#~/__mocks__/mockK8sStatus';
import {
  assembleConfigMap,
  createConfigMap,
  deleteConfigMap,
  getConfigMap,
  replaceConfigMap,
} from '#~/api/k8s/configMaps';
import { ConfigMapModel } from '#~/api/models';
import { ConfigMapKind } from '#~/k8sTypes';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sGetResource: jest.fn(),
  k8sCreateResource: jest.fn(),
  k8sUpdateResource: jest.fn(),
  k8sDeleteResource: jest.fn(),
}));

const k8sGetResourceMock = jest.mocked(k8sGetResource<ConfigMapKind>);
const k8sCreateResourceMock = jest.mocked(k8sCreateResource<ConfigMapKind>);
const k8sUpdateResourceMock = jest.mocked(k8sUpdateResource<ConfigMapKind>);
const k8sDeleteResourceMock = jest.mocked(k8sDeleteResource<ConfigMapKind, K8sStatus>);

const configMapData = {
  key1: 'value1',
};
const namespace = 'test';
const configMapMock = mockConfigMap({ data: configMapData, namespace });
const configMapName = configMapMock.metadata.name;

describe('assembleConfigMap', () => {
  it('should return assembled configMap  when config name is present', () => {
    const configMap = assembleConfigMap(namespace, configMapData, configMapName);
    expect(configMap).toStrictEqual(configMapMock);
  });

  it('should return assembled configMap  when config name is not present', () => {
    const configMap = assembleConfigMap(namespace, configMapData);

    expect(configMap.apiVersion).toStrictEqual('v1');
    expect(configMap.data).toStrictEqual(configMapData);
    expect(configMap.metadata.name).toMatch(/^configmap-[a-zA-Z0-9]+$/);
  });
});

describe('getConfigMap', () => {
  it('should fetch a ConfigMap successfully', async () => {
    k8sGetResourceMock.mockResolvedValue(configMapMock);

    const result = await getConfigMap(namespace, configMapName);
    expect(result).toStrictEqual(configMapMock);
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      fetchOptions: {
        requestInit: {},
      },
      model: ConfigMapModel,
      queryOptions: { name: configMapName, ns: namespace, queryParams: {} },
    });
  });

  it('should handle errors and rethrow', async () => {
    k8sGetResourceMock.mockRejectedValue(new Error('error1'));

    await expect(getConfigMap(namespace, configMapName)).rejects.toThrow('error1');
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      fetchOptions: {
        requestInit: {},
      },
      model: ConfigMapModel,
      queryOptions: { name: configMapName, ns: namespace, queryParams: {} },
    });
  });
});

describe('createConfigMap', () => {
  it('should successfully create a configMap', async () => {
    k8sCreateResourceMock.mockResolvedValue(configMapMock);

    const result = await createConfigMap(
      assembleConfigMap(namespace, configMapData, configMapName),
    );
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sCreateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ConfigMapModel,
      queryOptions: { queryParams: {} },
      resource: configMapMock,
    });
    expect(result).toStrictEqual(configMapMock);
  });

  it('should handle errors and rethrow', async () => {
    k8sCreateResourceMock.mockRejectedValue(new Error('error1'));

    await expect(
      createConfigMap(assembleConfigMap(namespace, configMapData, configMapName)),
    ).rejects.toThrow('error1');
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sCreateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ConfigMapModel,
      queryOptions: { queryParams: {} },
      resource: configMapMock,
    });
  });
});

describe('replaceConfigMap', () => {
  it('should successfully replace configMap', async () => {
    k8sUpdateResourceMock.mockResolvedValue(configMapMock);

    const result = await replaceConfigMap(
      assembleConfigMap(namespace, configMapData, configMapName),
    );
    expect(k8sUpdateResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sUpdateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ConfigMapModel,
      queryOptions: { queryParams: {} },
      resource: configMapMock,
    });
    expect(result).toStrictEqual(configMapMock);
  });

  it('should handle errors and rethrow', async () => {
    k8sUpdateResourceMock.mockRejectedValue(new Error('error1'));

    await expect(
      replaceConfigMap(assembleConfigMap(namespace, configMapData, configMapName)),
    ).rejects.toThrow('error1');
    expect(k8sUpdateResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sUpdateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ConfigMapModel,
      queryOptions: { queryParams: {} },
      resource: configMapMock,
    });
  });
});

describe('deleteConfigMap', () => {
  it('should successfully delete configMap', async () => {
    const mockStatus = mock200Status({});
    k8sDeleteResourceMock.mockResolvedValue(mockStatus);

    const result = await deleteConfigMap(namespace, configMapName);
    expect(result).toStrictEqual(mockStatus);
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ConfigMapModel,
      queryOptions: {
        name: configMapName,
        ns: namespace,
        queryParams: {},
      },
    });
  });

  it('should return status failure when unsuccessful', async () => {
    const mockStatus = mock404Error({});
    k8sDeleteResourceMock.mockResolvedValue(mockStatus);

    const result = await deleteConfigMap(namespace, configMapName);
    expect(result).toStrictEqual(mockStatus);
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ConfigMapModel,
      queryOptions: {
        name: configMapName,
        ns: namespace,
        queryParams: {},
      },
    });
  });

  it('should handle errors and rethrow', async () => {
    k8sDeleteResourceMock.mockRejectedValue(new Error('error1'));

    await expect(deleteConfigMap(namespace, configMapName)).rejects.toThrow('error1');
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: ConfigMapModel,
      queryOptions: {
        name: configMapName,
        ns: namespace,
        queryParams: {},
      },
    });
  });
});
