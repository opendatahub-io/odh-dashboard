import { k8sDeleteResource } from '@openshift/dynamic-plugin-sdk-utils';
import { RayJobModel } from '@odh-dashboard/internal/api/models/kubeflow';
import { deleteRayJob } from '../rayJobs';

jest.mock('@openshift/dynamic-plugin-sdk-utils');

const mockK8sDeleteResource = jest.mocked(k8sDeleteResource);

describe('RayJob API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('deleteRayJob', () => {
    it('should delete a RayJob', async () => {
      const mockStatus = { kind: 'Status', status: 'Success' };
      mockK8sDeleteResource.mockResolvedValue(mockStatus);

      const result = await deleteRayJob('test-ray-job', 'test-namespace');

      expect(mockK8sDeleteResource).toHaveBeenCalledWith(
        expect.objectContaining({
          model: RayJobModel,
          queryOptions: expect.objectContaining({
            name: 'test-ray-job',
            ns: 'test-namespace',
          }),
        }),
      );
      expect(result).toEqual(mockStatus);
    });

    it('should handle deletion errors', async () => {
      const error = new Error('Deletion failed');
      mockK8sDeleteResource.mockRejectedValue(error);

      await expect(deleteRayJob('test-ray-job', 'test-namespace')).rejects.toThrow(
        'Deletion failed',
      );
    });
  });
});
