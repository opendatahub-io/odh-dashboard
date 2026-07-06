import { k8sDeleteResource } from '@openshift/dynamic-plugin-sdk-utils';
import { TrainJobModel } from '@odh-dashboard/internal/api/models/kubeflow';
import { deleteTrainJob } from '../trainJobs';

jest.mock('@openshift/dynamic-plugin-sdk-utils');
jest.mock('../workloads');
jest.mock('../lifecycle');

const mockK8sDeleteResource = jest.mocked(k8sDeleteResource);

describe('TrainJob API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('deleteTrainJob', () => {
    it('should delete a TrainJob', async () => {
      const mockStatus = { kind: 'Status', status: 'Success' };
      mockK8sDeleteResource.mockResolvedValue(mockStatus);

      const result = await deleteTrainJob('test-job', 'test-namespace');

      expect(mockK8sDeleteResource).toHaveBeenCalledWith(
        expect.objectContaining({
          model: TrainJobModel,
          queryOptions: expect.objectContaining({
            name: 'test-job',
            ns: 'test-namespace',
          }),
        }),
      );
      expect(result).toEqual(mockStatus);
    });

    it('should handle deletion errors', async () => {
      const error = new Error('Deletion failed');
      mockK8sDeleteResource.mockRejectedValue(error);

      await expect(deleteTrainJob('test-job', 'test-namespace')).rejects.toThrow('Deletion failed');
    });
  });
});
