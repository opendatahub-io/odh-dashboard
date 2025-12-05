import { k8sDeleteResource, k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { TrainJobModel } from '@odh-dashboard/internal/api/models/kubeflow';
import { deleteTrainJob, retryTrainJob } from '../trainJobs';
import { mockTrainJobK8sResource } from '../../__mocks__/mockTrainJobK8sResource';
import { deleteJobSetForTrainJob, deleteWorkloadForTrainJob } from '../workloads';
import { patchTrainJobSuspension } from '../lifecycle';

jest.mock('@openshift/dynamic-plugin-sdk-utils');
jest.mock('../workloads');
jest.mock('../lifecycle');

const mockK8sDeleteResource = jest.mocked(k8sDeleteResource);
const mockK8sPatchResource = jest.mocked(k8sPatchResource);
const mockDeleteJobSetForTrainJob = jest.mocked(deleteJobSetForTrainJob);
const mockDeleteWorkloadForTrainJob = jest.mocked(deleteWorkloadForTrainJob);
const mockPatchTrainJobSuspension = jest.mocked(patchTrainJobSuspension);

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

  describe('retryTrainJob', () => {
    const mockJob = mockTrainJobK8sResource({
      name: 'test-job',
      namespace: 'test-namespace',
    });

    it('should retry a failed job with retry timestamp', async () => {
      const updatedJob = { ...mockJob };
      mockDeleteJobSetForTrainJob.mockResolvedValue(undefined);
      mockDeleteWorkloadForTrainJob.mockResolvedValue(undefined);
      mockK8sPatchResource.mockResolvedValue(updatedJob);

      const result = await retryTrainJob(mockJob);

      expect(mockDeleteJobSetForTrainJob).toHaveBeenCalledWith(
        'test-job',
        'test-namespace',
        undefined,
      );
      expect(mockDeleteWorkloadForTrainJob).toHaveBeenCalledWith(mockJob, undefined);
      expect(mockK8sPatchResource).toHaveBeenCalledWith(
        expect.objectContaining({
          model: TrainJobModel,
          patches: expect.arrayContaining([
            expect.objectContaining({
              op: 'add',
              path: '/metadata/annotations',
              value: expect.objectContaining({
                'trainer.kubeflow.org/retry-timestamp': expect.any(String),
              }),
            }),
          ]),
        }),
      );
      expect(result).toEqual(updatedJob);
    });

    it('should unsuspend suspended job before retry', async () => {
      const suspendedJob = mockTrainJobK8sResource({
        name: 'test-job',
        namespace: 'test-namespace',
        suspend: true,
      });
      const updatedJob = { ...suspendedJob, spec: { ...suspendedJob.spec, suspend: false } };
      mockDeleteJobSetForTrainJob.mockResolvedValue(undefined);
      mockDeleteWorkloadForTrainJob.mockResolvedValue(undefined);
      mockPatchTrainJobSuspension.mockResolvedValue(updatedJob);

      const result = await retryTrainJob(suspendedJob);

      expect(mockPatchTrainJobSuspension).toHaveBeenCalledWith(suspendedJob, false, undefined);
      expect(result).toEqual(updatedJob);
    });

    it('should handle retry errors', async () => {
      const error = new Error('Patch failed');
      mockDeleteJobSetForTrainJob.mockResolvedValue(undefined);
      mockDeleteWorkloadForTrainJob.mockResolvedValue(undefined);
      mockK8sPatchResource.mockRejectedValue(error);

      await expect(retryTrainJob(mockJob)).rejects.toThrow('Failed to retry job: Patch failed');
    });

    it('should preserve existing annotations when adding retry timestamp', async () => {
      const jobWithAnnotations = {
        ...mockJob,
        metadata: {
          ...mockJob.metadata,
          annotations: {
            'existing-annotation': 'value',
          },
        },
      };
      mockDeleteJobSetForTrainJob.mockResolvedValue(undefined);
      mockDeleteWorkloadForTrainJob.mockResolvedValue(undefined);
      mockK8sPatchResource.mockResolvedValue(jobWithAnnotations);

      await retryTrainJob(jobWithAnnotations);

      expect(mockK8sPatchResource).toHaveBeenCalledWith(
        expect.objectContaining({
          patches: expect.arrayContaining([
            expect.objectContaining({
              value: expect.objectContaining({
                'existing-annotation': 'value',
                'trainer.kubeflow.org/retry-timestamp': expect.any(String),
              }),
            }),
          ]),
        }),
      );
    });
  });
});
