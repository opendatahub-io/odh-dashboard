import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { RayClusterModel } from '@odh-dashboard/internal/api/models/kubeflow';
import { mockRayClusterK8sResource } from '../../__mocks__/mockRayClusterK8sResource';
import { getRayCluster } from '../rayClusters';

jest.mock('@openshift/dynamic-plugin-sdk-utils');

const mockK8sGetResource = jest.mocked(k8sGetResource);

describe('RayCluster API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRayCluster', () => {
    it('should fetch a RayCluster by name and namespace', async () => {
      const mockCluster = mockRayClusterK8sResource({
        name: 'my-cluster',
        namespace: 'my-namespace',
        rayVersion: '2.9.0',
      });
      mockK8sGetResource.mockResolvedValue(mockCluster);

      const result = await getRayCluster('my-cluster', 'my-namespace');

      expect(mockK8sGetResource).toHaveBeenCalledWith(
        expect.objectContaining({
          model: RayClusterModel,
          queryOptions: expect.objectContaining({
            name: 'my-cluster',
            ns: 'my-namespace',
          }),
        }),
      );
      expect(result).toEqual(mockCluster);
      expect(result.spec.rayVersion).toBe('2.9.0');
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Not found');
      mockK8sGetResource.mockRejectedValue(error);

      await expect(getRayCluster('missing-cluster', 'test-ns')).rejects.toThrow('Not found');
    });
  });
});
