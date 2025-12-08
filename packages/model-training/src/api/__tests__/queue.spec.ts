import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { LocalQueueModel, ClusterQueueModel } from '@odh-dashboard/internal/api/models/kueue';
import { LocalQueueKind, ClusterQueueKind } from '@odh-dashboard/internal/k8sTypes';
import { getLocalQueue, getClusterQueue } from '../queue';

jest.mock('@openshift/dynamic-plugin-sdk-utils');

const mockK8sGetResource = jest.mocked(k8sGetResource);

describe('Queue API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLocalQueue', () => {
    const mockLocalQueue: LocalQueueKind = {
      apiVersion: 'kueue.x-k8s.io/v1beta1',
      kind: 'LocalQueue',
      metadata: {
        name: 'test-queue',
        namespace: 'test-namespace',
      },
      spec: {
        clusterQueue: 'cluster-queue',
      },
    };

    it('should fetch LocalQueue by name and namespace', async () => {
      mockK8sGetResource.mockResolvedValue(mockLocalQueue);

      const result = await getLocalQueue('test-queue', 'test-namespace');

      expect(mockK8sGetResource).toHaveBeenCalledWith({
        model: LocalQueueModel,
        queryOptions: {
          name: 'test-queue',
          ns: 'test-namespace',
        },
      });
      expect(result).toEqual(mockLocalQueue);
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Not found');
      mockK8sGetResource.mockRejectedValue(error);

      await expect(getLocalQueue('test-queue', 'test-namespace')).rejects.toThrow('Not found');
    });
  });

  describe('getClusterQueue', () => {
    const mockClusterQueue: ClusterQueueKind = {
      apiVersion: 'kueue.x-k8s.io/v1beta1',
      kind: 'ClusterQueue',
      metadata: {
        name: 'cluster-queue',
      },
      spec: {
        cohort: 'default-cohort',
        resourceGroups: [],
      },
    };

    it('should fetch ClusterQueue by name', async () => {
      mockK8sGetResource.mockResolvedValue(mockClusterQueue);

      const result = await getClusterQueue('cluster-queue');

      expect(mockK8sGetResource).toHaveBeenCalledWith({
        model: ClusterQueueModel,
        queryOptions: {
          name: 'cluster-queue',
        },
      });
      expect(result).toEqual(mockClusterQueue);
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Not found');
      mockK8sGetResource.mockRejectedValue(error);

      await expect(getClusterQueue('cluster-queue')).rejects.toThrow('Not found');
    });

    it('should not include namespace in query options', async () => {
      mockK8sGetResource.mockResolvedValue(mockClusterQueue);

      await getClusterQueue('cluster-queue');

      expect(mockK8sGetResource).toHaveBeenCalledWith(
        expect.objectContaining({
          queryOptions: expect.not.objectContaining({
            ns: expect.anything(),
          }),
        }),
      );
    });
  });
});
