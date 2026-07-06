import { k8sGetResource, k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { mockClusterQueueK8sResource } from '#~/__mocks__/mockClusterQueueK8sResource';
import { ClusterQueueKind } from '#~/k8sTypes';
import { getClusterQueue, listClusterQueues } from '#~/api/k8s/clusterQueues';
import { ClusterQueueModel } from '#~/api/models/kueue';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sGetResource: jest.fn(),
  k8sListResourceItems: jest.fn(),
}));

const k8sGetResourceMock = jest.mocked(k8sGetResource<ClusterQueueKind>);
const k8sListResourceItemsMock = jest.mocked(k8sListResourceItems<ClusterQueueKind>);

const clusterQueueMock = mockClusterQueueK8sResource({ name: 'test-cluster-queue' });

describe('listClusterQueues', () => {
  it('should fetch and return clusterqueues', async () => {
    k8sListResourceItemsMock.mockResolvedValue([clusterQueueMock]);
    const result = await listClusterQueues();
    expect(k8sListResourceItemsMock).toHaveBeenCalledWith({
      model: ClusterQueueModel,
      queryOptions: {},
    });
    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual([clusterQueueMock]);
  });

  it('should handle errors and rethrow', async () => {
    k8sListResourceItemsMock.mockRejectedValue(new Error('error1'));
    await expect(listClusterQueues()).rejects.toThrow('error1');
    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceItemsMock).toHaveBeenCalledWith({
      model: ClusterQueueModel,
      queryOptions: {},
    });
  });
});

describe('getClusterQueue', () => {
  it('should fetch and return a cluster queue by name', async () => {
    k8sGetResourceMock.mockResolvedValue(clusterQueueMock);
    const result = await getClusterQueue('test-cluster-queue');
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      model: ClusterQueueModel,
      queryOptions: { name: 'test-cluster-queue' },
    });
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(clusterQueueMock);
  });

  it('should handle errors and rethrow', async () => {
    k8sGetResourceMock.mockRejectedValue(new Error('error1'));
    await expect(getClusterQueue('test-cluster-queue')).rejects.toThrow('error1');
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      model: ClusterQueueModel,
      queryOptions: { name: 'test-cluster-queue' },
    });
  });
});
