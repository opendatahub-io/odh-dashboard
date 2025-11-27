import { k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { TrainJobModel } from '@odh-dashboard/internal/api/models/kubeflow';
import { mockWorkloadK8sResource } from '@odh-dashboard/internal/__mocks__/mockWorkloadK8sResource';
import {
  pauseTrainJob,
  resumeTrainJob,
  toggleTrainJobHibernation,
  patchTrainJobSuspension,
} from '../lifecycle';
import { mockTrainJobK8sResource } from '../../__mocks__/mockTrainJobK8sResource';
import { getWorkloadForTrainJob, patchWorkloadHibernation } from '../workloads';

jest.mock('@openshift/dynamic-plugin-sdk-utils');
jest.mock('../workloads');

const mockK8sPatchResource = jest.mocked(k8sPatchResource);
const mockGetWorkloadForTrainJob = jest.mocked(getWorkloadForTrainJob);
const mockPatchWorkloadHibernation = jest.mocked(patchWorkloadHibernation);

describe('Lifecycle API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('patchTrainJobSuspension', () => {
    const mockJob = mockTrainJobK8sResource({
      name: 'test-job',
      namespace: 'test-namespace',
      suspend: false,
    });

    it('should use replace operation when suspend exists', async () => {
      const updatedJob = { ...mockJob, spec: { ...mockJob.spec, suspend: true } };
      mockK8sPatchResource.mockResolvedValue(updatedJob);

      const result = await patchTrainJobSuspension(mockJob, true);

      expect(mockK8sPatchResource).toHaveBeenCalledWith(
        expect.objectContaining({
          model: TrainJobModel,
          queryOptions: expect.objectContaining({
            name: 'test-job',
            ns: 'test-namespace',
          }),
          patches: [
            {
              op: 'replace',
              path: '/spec/suspend',
              value: true,
            },
          ],
        }),
      );
      expect(result).toEqual(updatedJob);
    });

    it('should use add operation when suspend is undefined', async () => {
      const jobWithoutSuspend = mockTrainJobK8sResource({
        name: 'test-job',
        namespace: 'test-namespace',
        suspend: undefined,
      });
      const updatedJob = { ...jobWithoutSuspend, spec: { suspend: true } };
      mockK8sPatchResource.mockResolvedValue(updatedJob);

      const result = await patchTrainJobSuspension(jobWithoutSuspend, true);

      expect(mockK8sPatchResource).toHaveBeenCalledWith(
        expect.objectContaining({
          patches: [
            {
              op: 'add',
              path: '/spec/suspend',
              value: true,
            },
          ],
        }),
      );
      expect(result).toEqual(updatedJob);
    });

    it('should handle patch errors', async () => {
      const error = new Error('Patch failed');
      mockK8sPatchResource.mockRejectedValue(error);

      await expect(patchTrainJobSuspension(mockJob, true)).rejects.toThrow('Patch failed');
    });
  });

  describe('pauseTrainJob', () => {
    const mockJob = mockTrainJobK8sResource({
      name: 'test-job',
      namespace: 'test-namespace',
    });

    it('should pause Kueue-enabled job via workload', async () => {
      const mockWorkload = mockWorkloadK8sResource({ k8sName: 'test-workload' });
      mockGetWorkloadForTrainJob.mockResolvedValue(mockWorkload);
      const updatedWorkload = mockWorkloadK8sResource({ k8sName: 'test-workload' });
      updatedWorkload.spec.active = false;
      mockPatchWorkloadHibernation.mockResolvedValue(updatedWorkload);

      const result = await pauseTrainJob(mockJob);

      expect(mockGetWorkloadForTrainJob).toHaveBeenCalledWith(mockJob);
      expect(mockPatchWorkloadHibernation).toHaveBeenCalledWith(mockWorkload, true, undefined);
      expect(result).toEqual({
        success: true,
        workload: updatedWorkload,
      });
    });

    it('should pause non-Kueue job via spec.suspend', async () => {
      mockGetWorkloadForTrainJob.mockResolvedValue(null);
      const updatedJob = { ...mockJob, spec: { ...mockJob.spec, suspend: true } };
      mockK8sPatchResource.mockResolvedValue(updatedJob);

      const result = await pauseTrainJob(mockJob);

      expect(mockK8sPatchResource).toHaveBeenCalledWith(
        expect.objectContaining({
          patches: [expect.objectContaining({ value: true })],
        }),
      );
      expect(result).toEqual({
        success: true,
        updatedJob,
      });
    });

    it('should return error result on failure', async () => {
      mockGetWorkloadForTrainJob.mockRejectedValue(new Error('Workload fetch failed'));

      const result = await pauseTrainJob(mockJob);

      expect(result).toEqual({
        success: false,
        error: 'Failed to pause job: Workload fetch failed',
      });
    });
  });

  describe('resumeTrainJob', () => {
    const mockJob = mockTrainJobK8sResource({
      name: 'test-job',
      namespace: 'test-namespace',
    });

    it('should resume Kueue-enabled job via workload', async () => {
      const mockWorkload = mockWorkloadK8sResource({ k8sName: 'test-workload' });
      mockWorkload.spec.active = false;
      mockGetWorkloadForTrainJob.mockResolvedValue(mockWorkload);
      const updatedWorkload = mockWorkloadK8sResource({ k8sName: 'test-workload' });
      mockPatchWorkloadHibernation.mockResolvedValue(updatedWorkload);

      const result = await resumeTrainJob(mockJob);

      expect(mockGetWorkloadForTrainJob).toHaveBeenCalledWith(mockJob);
      expect(mockPatchWorkloadHibernation).toHaveBeenCalledWith(mockWorkload, false, undefined);
      expect(result).toEqual({
        success: true,
        workload: updatedWorkload,
      });
    });

    it('should resume non-Kueue job via spec.suspend', async () => {
      mockGetWorkloadForTrainJob.mockResolvedValue(null);
      const updatedJob = { ...mockJob, spec: { ...mockJob.spec, suspend: false } };
      mockK8sPatchResource.mockResolvedValue(updatedJob);

      const result = await resumeTrainJob(mockJob);

      expect(mockK8sPatchResource).toHaveBeenCalledWith(
        expect.objectContaining({
          patches: [expect.objectContaining({ value: false })],
        }),
      );
      expect(result).toEqual({
        success: true,
        updatedJob,
      });
    });

    it('should return error result on failure', async () => {
      mockGetWorkloadForTrainJob.mockRejectedValue(new Error('Workload fetch failed'));

      const result = await resumeTrainJob(mockJob);

      expect(result).toEqual({
        success: false,
        error: 'Failed to resume job: Workload fetch failed',
      });
    });
  });

  describe('toggleTrainJobHibernation', () => {
    const mockJob = mockTrainJobK8sResource({
      name: 'test-job',
      namespace: 'test-namespace',
      suspend: false,
    });

    it('should toggle from active to hibernated (Kueue job)', async () => {
      const activeWorkload = mockWorkloadK8sResource({ k8sName: 'test-workload' });
      mockGetWorkloadForTrainJob.mockResolvedValue(activeWorkload);
      const hibernatedWorkload = mockWorkloadK8sResource({ k8sName: 'test-workload' });
      hibernatedWorkload.spec.active = false;
      mockPatchWorkloadHibernation.mockResolvedValue(hibernatedWorkload);

      const result = await toggleTrainJobHibernation(mockJob);

      expect(mockPatchWorkloadHibernation).toHaveBeenCalledWith(activeWorkload, true, undefined);
      expect(result).toEqual({
        success: true,
        workload: hibernatedWorkload,
      });
    });

    it('should toggle from hibernated to active (Kueue job)', async () => {
      const hibernatedWorkload = mockWorkloadK8sResource({ k8sName: 'test-workload' });
      hibernatedWorkload.spec.active = false;
      mockGetWorkloadForTrainJob.mockResolvedValue(hibernatedWorkload);
      const activeWorkload = mockWorkloadK8sResource({ k8sName: 'test-workload' });
      mockPatchWorkloadHibernation.mockResolvedValue(activeWorkload);

      const result = await toggleTrainJobHibernation(mockJob);

      expect(mockPatchWorkloadHibernation).toHaveBeenCalledWith(
        hibernatedWorkload,
        false,
        undefined,
      );
      expect(result).toEqual({
        success: true,
        workload: activeWorkload,
      });
    });

    it('should toggle from running to suspended (non-Kueue job)', async () => {
      mockGetWorkloadForTrainJob.mockResolvedValue(null);
      const suspendedJob = { ...mockJob, spec: { ...mockJob.spec, suspend: true } };
      mockK8sPatchResource.mockResolvedValue(suspendedJob);

      const result = await toggleTrainJobHibernation(mockJob);

      expect(mockK8sPatchResource).toHaveBeenCalledWith(
        expect.objectContaining({
          patches: [expect.objectContaining({ value: true })],
        }),
      );
      expect(result).toEqual({
        success: true,
        updatedJob: suspendedJob,
      });
    });

    it('should toggle from suspended to running (non-Kueue job)', async () => {
      const suspendedJob = mockTrainJobK8sResource({
        name: 'test-job',
        namespace: 'test-namespace',
        suspend: true,
      });
      mockGetWorkloadForTrainJob.mockResolvedValue(null);
      const runningJob = { ...suspendedJob, spec: { ...suspendedJob.spec, suspend: false } };
      mockK8sPatchResource.mockResolvedValue(runningJob);

      const result = await toggleTrainJobHibernation(suspendedJob);

      expect(mockK8sPatchResource).toHaveBeenCalledWith(
        expect.objectContaining({
          patches: [expect.objectContaining({ value: false })],
        }),
      );
      expect(result).toEqual({
        success: true,
        updatedJob: runningJob,
      });
    });

    it('should handle errors gracefully', async () => {
      mockGetWorkloadForTrainJob.mockRejectedValue(new Error('Fetch failed'));

      const result = await toggleTrainJobHibernation(mockJob);

      expect(result).toEqual({
        success: false,
        error: 'Failed to toggle hibernation: Fetch failed',
      });
    });
  });
});
