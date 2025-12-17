import { k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { TrainJobModel } from '@odh-dashboard/internal/api/models/kubeflow';
import { mockWorkloadK8sResource } from '@odh-dashboard/internal/__mocks__/mockWorkloadK8sResource';
import { setTrainJobPauseState, patchTrainJobSuspension } from '../lifecycle';
import { mockTrainJobK8sResource } from '../../__mocks__/mockTrainJobK8sResource';
import { getWorkloadForTrainJob, patchWorkloadActiveState } from '../workloads';

jest.mock('@openshift/dynamic-plugin-sdk-utils');
jest.mock('../workloads');

const mockK8sPatchResource = jest.mocked(k8sPatchResource);
const mockGetWorkloadForTrainJob = jest.mocked(getWorkloadForTrainJob);
const mockPatchWorkloadActiveState = jest.mocked(patchWorkloadActiveState);

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

  describe('setTrainJobPauseState', () => {
    const mockJob = mockTrainJobK8sResource({
      name: 'test-job',
      namespace: 'test-namespace',
    });

    describe('pause (pause=true)', () => {
      it('should pause Kueue-enabled job via workload', async () => {
        const mockWorkload = mockWorkloadK8sResource({ k8sName: 'test-workload' });
        mockGetWorkloadForTrainJob.mockResolvedValue(mockWorkload);
        const updatedWorkload = mockWorkloadK8sResource({ k8sName: 'test-workload' });
        updatedWorkload.spec.active = false;
        mockPatchWorkloadActiveState.mockResolvedValue(updatedWorkload);

        const result = await setTrainJobPauseState(mockJob, true);

        expect(mockGetWorkloadForTrainJob).toHaveBeenCalledWith(mockJob);
        expect(mockPatchWorkloadActiveState).toHaveBeenCalledWith(mockWorkload, true, undefined);
        expect(result).toEqual({
          success: true,
          workload: updatedWorkload,
        });
      });

      it('should pause non-Kueue job via spec.suspend', async () => {
        mockGetWorkloadForTrainJob.mockResolvedValue(null);
        const updatedJob = { ...mockJob, spec: { ...mockJob.spec, suspend: true } };
        mockK8sPatchResource.mockResolvedValue(updatedJob);

        const result = await setTrainJobPauseState(mockJob, true);

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

        const result = await setTrainJobPauseState(mockJob, true);

        expect(result).toEqual({
          success: false,
          error: 'Failed to pause job: Workload fetch failed',
        });
      });
    });

    describe('resume (pause=false)', () => {
      it('should resume Kueue-enabled job via workload', async () => {
        const mockWorkload = mockWorkloadK8sResource({ k8sName: 'test-workload' });
        mockWorkload.spec.active = false;
        mockGetWorkloadForTrainJob.mockResolvedValue(mockWorkload);
        const updatedWorkload = mockWorkloadK8sResource({ k8sName: 'test-workload' });
        mockPatchWorkloadActiveState.mockResolvedValue(updatedWorkload);

        const result = await setTrainJobPauseState(mockJob, false);

        expect(mockGetWorkloadForTrainJob).toHaveBeenCalledWith(mockJob);
        expect(mockPatchWorkloadActiveState).toHaveBeenCalledWith(mockWorkload, false, undefined);
        expect(result).toEqual({
          success: true,
          workload: updatedWorkload,
        });
      });

      it('should resume non-Kueue job via spec.suspend', async () => {
        mockGetWorkloadForTrainJob.mockResolvedValue(null);
        const updatedJob = { ...mockJob, spec: { ...mockJob.spec, suspend: false } };
        mockK8sPatchResource.mockResolvedValue(updatedJob);

        const result = await setTrainJobPauseState(mockJob, false);

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

        const result = await setTrainJobPauseState(mockJob, false);

        expect(result).toEqual({
          success: false,
          error: 'Failed to resume job: Workload fetch failed',
        });
      });
    });
  });
});
