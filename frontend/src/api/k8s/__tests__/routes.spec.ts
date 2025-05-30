import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { mockRouteK8sResource } from '#~/__mocks__/mockRouteK8sResource';
import { getRoute } from '#~/api/k8s/routes';
import { RouteModel } from '#~/api/models';
import { RouteKind } from '#~/k8sTypes';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sGetResource: jest.fn(),
}));

const k8sGetResourceMock = jest.mocked(k8sGetResource<RouteKind>);

describe('getRoute', () => {
  const name = 'test';
  const namespace = 'test-project';

  it('should return route when k8s api option is not given', async () => {
    const routeMock = mockRouteK8sResource({});
    k8sGetResourceMock.mockResolvedValue(routeMock);
    const result = await getRoute(name, namespace);
    expect(result).toStrictEqual(routeMock);
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      fetchOptions: {
        requestInit: {},
      },
      model: RouteModel,
      queryOptions: { name, ns: namespace, queryParams: {} },
    });
  });

  it('should return route when k8s api option is given', async () => {
    const routeMock = mockRouteK8sResource({});
    k8sGetResourceMock.mockResolvedValue(routeMock);
    const result = await getRoute(name, namespace, { dryRun: true });
    expect(result).toStrictEqual(routeMock);
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      fetchOptions: {
        requestInit: {},
      },
      payload: {
        dryRun: ['All'],
      },
      model: RouteModel,
      queryOptions: { name, ns: namespace, queryParams: { dryRun: 'All' } },
    });
  });

  it('should handle errors and rethrows', async () => {
    k8sGetResourceMock.mockRejectedValue(new Error('error'));
    await expect(getRoute(name, namespace)).rejects.toThrow('error');
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      fetchOptions: {
        requestInit: {},
      },
      model: RouteModel,
      queryOptions: { name, ns: namespace, queryParams: {} },
    });
  });
});
