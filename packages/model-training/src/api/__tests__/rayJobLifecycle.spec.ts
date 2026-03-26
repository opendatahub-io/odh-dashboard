import { k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { RayJobModel } from '@odh-dashboard/internal/api/models/kubeflow';
import { mockWorkloadK8sResource } from '@odh-dashboard/internal/__mocks__/mockWorkloadK8sResource';
import { patchRayJobSuspension, setRayJobPauseState } from '../rayJobLifecycle';
import { mockRayJobK8sResource } from '../../__mocks__/mockRayJobK8sResource';
import { getWorkloadForJob, patchWorkloadActiveState } from '../workloads';

jest.mock('@openshift/dynamic-plugin-sdk-utils');
jest.mock('../workloads');

const mockK8sPatchResource = jest.mocked(k8sPatchResource);
const mockGetWorkloadForJob = jest.mocked(getWorkloadForJob);
const mockPatchWorkloadActiveState = jest.mocked(patchWorkloadActiveState);

describe('RayJob Lifecycle API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('patchRayJobSuspension', () => {
    const mockJob = mockRayJobK8sResource({
      name: 'test-ray-job',
      namespace: 'test-namespace',
      suspend: false,
    });

    it('should use replace operation when suspend exists', async () => {
      const updatedJob = { ...mockJob, spec: { ...mockJob.spec, suspend: true } };
      mockK8sPatchResource.mockResolvedValue(updatedJob);

      const result = await patchRayJobSuspension(mockJob, true);

      expect(mockK8sPatchResource).toHaveBeenCalledWith(
        expect.objectContaining({
          model: RayJobModel,
          queryOptions: expect.objectContaining({
            name: 'test-ray-job',
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
      const base = mockRayJobK8sResource({ name: 'test-ray-job', namespace: 'test-namespace' });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { suspend, ...specWithoutSuspend } = base.spec;
      const jobWithoutSuspend = { ...base, spec: specWithoutSuspend };
      const updatedJob = { ...jobWithoutSuspend, spec: { suspend: true } };
      mockK8sPatchResource.mockResolvedValue(updatedJob);

      const result = await patchRayJobSuspension(jobWithoutSuspend as typeof base, true);

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

      await expect(patchRayJobSuspension(mockJob, true)).rejects.toThrow('Patch failed');
    });
  });

  describe('setRayJobPauseState', () => {
    const mockJob = mockRayJobK8sResource({
      name: 'test-ray-job',
      namespace: 'test-namespace',
    });

    describe('pause (pause=true)', () => {
      it('should pause Kueue-enabled job via workload', async () => {
        const mockWorkload = mockWorkloadK8sResource({ k8sName: 'test-workload' });
        mockGetWorkloadForJob.mockResolvedValue(mockWorkload);
        const updatedWorkload = mockWorkloadK8sResource({ k8sName: 'test-workload' });
        updatedWorkload.spec.active = false;
        mockPatchWorkloadActiveState.mockResolvedValue(updatedWorkload);

        const result = await setRayJobPauseState(mockJob, true);

        expect(mockGetWorkloadForJob).toHaveBeenCalledWith(mockJob);
        expect(mockPatchWorkloadActiveState).toHaveBeenCalledWith(mockWorkload, true, undefined);
        expect(result).toEqual({ success: true });
      });

      it('should pause non-Kueue job via spec.suspend', async () => {
        mockGetWorkloadForJob.mockResolvedValue(null);
        const updatedJob = { ...mockJob, spec: { ...mockJob.spec, suspend: true } };
        mockK8sPatchResource.mockResolvedValue(updatedJob);

        const result = await setRayJobPauseState(mockJob, true);

        expect(mockK8sPatchResource).toHaveBeenCalledWith(
          expect.objectContaining({
            patches: [expect.objectContaining({ value: true })],
          }),
        );
        expect(result).toEqual({ success: true, updatedJob });
      });

      it('should return error result on failure', async () => {
        mockGetWorkloadForJob.mockRejectedValue(new Error('Workload fetch failed'));

        const result = await setRayJobPauseState(mockJob, true);

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
        mockGetWorkloadForJob.mockResolvedValue(mockWorkload);
        const updatedWorkload = mockWorkloadK8sResource({ k8sName: 'test-workload' });
        mockPatchWorkloadActiveState.mockResolvedValue(updatedWorkload);

        const result = await setRayJobPauseState(mockJob, false);

        expect(mockGetWorkloadForJob).toHaveBeenCalledWith(mockJob);
        expect(mockPatchWorkloadActiveState).toHaveBeenCalledWith(mockWorkload, false, undefined);
        expect(result).toEqual({ success: true });
      });

      it('should resume non-Kueue job via spec.suspend', async () => {
        mockGetWorkloadForJob.mockResolvedValue(null);
        const updatedJob = { ...mockJob, spec: { ...mockJob.spec, suspend: false } };
        mockK8sPatchResource.mockResolvedValue(updatedJob);

        const result = await setRayJobPauseState(mockJob, false);

        expect(mockK8sPatchResource).toHaveBeenCalledWith(
          expect.objectContaining({
            patches: [expect.objectContaining({ value: false })],
          }),
        );
        expect(result).toEqual({ success: true, updatedJob });
      });

      it('should return error result on failure', async () => {
        mockGetWorkloadForJob.mockRejectedValue(new Error('Workload fetch failed'));

        const result = await setRayJobPauseState(mockJob, false);

        expect(result).toEqual({
          success: false,
          error: 'Failed to resume job: Workload fetch failed',
        });
      });
    });
  });
});
