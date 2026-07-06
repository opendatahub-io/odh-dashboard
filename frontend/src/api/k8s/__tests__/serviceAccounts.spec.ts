import {
  K8sStatus,
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import {
  assembleServiceAccount,
  createServiceAccount,
  deleteServiceAccount,
  getServiceAccount,
} from '#~/api/k8s/serviceAccounts';
import { ServiceAccountKind } from '#~/k8sTypes';
import { mockServiceAccountK8sResource } from '#~/__mocks__/mockServiceAccountK8sResource';
import { ServiceAccountModel } from '#~/api/models';
import { mock200Status, mock404Error } from '#~/__mocks__/mockK8sStatus';

const name = 'test';
const namespace = 'test-project';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sGetResource: jest.fn(),
  k8sCreateResource: jest.fn(),
  k8sDeleteResource: jest.fn(),
}));

const k8sGetResourceMock = jest.mocked(k8sGetResource<ServiceAccountKind>);
const k8sCreateResourceMock = jest.mocked(k8sCreateResource<ServiceAccountKind>);
const k8sDeleteResourceMock = jest.mocked(k8sDeleteResource<ServiceAccountKind, K8sStatus>);

describe('assembleServiceAccount', () => {
  it('should assemble service account correctly', () => {
    const result = assembleServiceAccount(name, namespace);
    expect(result).toStrictEqual({
      apiVersion: 'v1',
      kind: 'ServiceAccount',
      metadata: {
        name,
        namespace,
      },
    });
  });
});

describe('getServiceAccount', () => {
  it('should return service account', async () => {
    const serviceAccountMock = mockServiceAccountK8sResource({});
    k8sGetResourceMock.mockResolvedValue(serviceAccountMock);
    const result = await getServiceAccount(name, namespace);
    expect(result).toStrictEqual(serviceAccountMock);
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      model: ServiceAccountModel,
      queryOptions: { name, ns: namespace },
    });
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
  });

  it('should handle errors and rethrows', async () => {
    k8sGetResourceMock.mockRejectedValue(new Error('error'));
    await expect(getServiceAccount(name, namespace)).rejects.toThrow('error');
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      model: ServiceAccountModel,
      queryOptions: { name, ns: namespace },
    });
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
  });
});

describe('createServiceAccount', () => {
  const data = mockServiceAccountK8sResource({});

  it('should create service account', async () => {
    k8sCreateResourceMock.mockResolvedValue(data);
    const result = await createServiceAccount(data);
    expect(result).toStrictEqual(data);
    expect(k8sCreateResourceMock).toHaveBeenCalledWith({
      fetchOptions: {
        requestInit: {},
      },
      model: ServiceAccountModel,
      resource: data,
      queryOptions: {
        queryParams: {},
      },
    });
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
  });

  it('should handle errors and rethrows', async () => {
    k8sCreateResourceMock.mockRejectedValue(new Error('error'));
    await expect(createServiceAccount(data)).rejects.toThrow('error');
    expect(k8sCreateResourceMock).toHaveBeenCalledWith({
      fetchOptions: {
        requestInit: {},
      },
      model: ServiceAccountModel,
      resource: data,
      queryOptions: {
        queryParams: {},
      },
    });
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
  });
});

describe('deleteServiceAccount', () => {
  it('should delete service account', async () => {
    const mockStatus = mock200Status({});
    k8sDeleteResourceMock.mockResolvedValue(mockStatus);
    const result = await deleteServiceAccount(name, namespace);
    expect(result).toStrictEqual(mockStatus);
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      fetchOptions: {
        requestInit: {},
      },
      model: ServiceAccountModel,
      queryOptions: { name, ns: namespace, queryParams: {} },
    });
  });

  it('should return status as Failure', async () => {
    const mockStatus = mock404Error({});
    k8sDeleteResourceMock.mockResolvedValue(mockStatus);
    const result = await deleteServiceAccount(name, namespace);
    expect(result).toStrictEqual(mockStatus);
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      fetchOptions: {
        requestInit: {},
      },
      model: ServiceAccountModel,
      queryOptions: { name, ns: namespace, queryParams: {} },
    });
  });
  it('should handle errors and rethrows', async () => {
    k8sDeleteResourceMock.mockRejectedValue(new Error('error'));
    await expect(deleteServiceAccount(name, namespace)).rejects.toThrow('error');
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      fetchOptions: {
        requestInit: {},
      },
      model: ServiceAccountModel,
      queryOptions: { name, ns: namespace, queryParams: {} },
    });
  });
});
