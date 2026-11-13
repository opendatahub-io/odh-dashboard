import { k8sPatchResource, k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { WorkloadModel } from '@odh-dashboard/k8s-core/api/models';
import { listWorkloads } from '@odh-dashboard/internal/api/k8s/workloads';
import { mockWorkloadK8sResource } from '@odh-dashboard/internal/__mocks__/mockWorkloadK8sResource';
import { getWorkloadForJob, patchWorkloadActiveState } from '../workloads';
import { mockTrainJobK8sResource } from '../../__mocks__/mockTrainJobK8sResource';

jest.mock('@openshift/dynamic-plugin-sdk-utils');
jest.mock('@odh-dashboard/internal/api/k8s/workloads');

const mockK8sPatchResource = jest.mocked(k8sPatchResource);
const mockListWorkloads = jest.mocked(listWorkloads);
const mockK8sGetResource = jest.mocked(k8sGetResource);

describe('Workload API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockK8sGetResource.mockRejectedValue(new Error('Not found'));
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getWorkloadForJob', () => {
    const mockJob = mockTrainJobK8sResource({
      name: 'test-job',
      namespace: 'test-namespace',
      uid: 'test-uid-123',
    });

    const mockWorkload = mockWorkloadK8sResource({
      k8sName: 'test-workload',
      namespace: 'test-namespace',
    });

    it('should find workload by job UID', async () => {
      mockListWorkloads.mockResolvedValueOnce([mockWorkload]);

      const result = await getWorkloadForJob(mockJob);

      expect(mockListWorkloads).toHaveBeenCalledWith(
        'test-namespace',
        'kueue.x-k8s.io/job-uid=test-uid-123',
      );
      expect(result).toEqual(mockWorkload);
    });

    it('should fallback to job name if UID search returns empty', async () => {
      mockListWorkloads
        .mockResolvedValueOnce([]) // First call (by UID) returns empty
        .mockResolvedValueOnce([mockWorkload]); // Second call (by name) returns workload

      const result = await getWorkloadForJob(mockJob);

      expect(mockListWorkloads).toHaveBeenCalledTimes(2);
      expect(mockListWorkloads).toHaveBeenNthCalledWith(
        1,
        'test-namespace',
        'kueue.x-k8s.io/job-uid=test-uid-123',
      );
      expect(mockListWorkloads).toHaveBeenNthCalledWith(
        2,
        'test-namespace',
        'kueue.x-k8s.io/job-name=test-job',
      );
      expect(result).toEqual(mockWorkload);
    });

    it('should return null if no workload found', async () => {
      mockListWorkloads.mockResolvedValue([]);

      const result = await getWorkloadForJob(mockJob);

      expect(result).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      mockListWorkloads.mockRejectedValue(new Error('API error'));

      const result = await getWorkloadForJob(mockJob);

      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to fetch workload for job:',
        expect.any(Error),
      );
    });

    describe('JobSet UID fallback (TrainJob only)', () => {
      const mockTrainJob = mockTrainJobK8sResource({
        name: 'gpu-training',
        uid: 'trainjob-uid-1111',
      });
      const jobSetUid = 'jobset-uid-2222';
      const expectedWorkload = mockWorkloadK8sResource({
        k8sName: 'jobset-gpu-training-abcde',
      });

      it('should resolve workload via JobSet UID when UID and name lookups fail', async () => {
        // Step 1 & 2: UID and name lookups return empty
        mockListWorkloads.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
        // Step 3a: JobSet found with its UID
        mockK8sGetResource.mockResolvedValueOnce({
          apiVersion: 'jobset.x-k8s.io/v1alpha2',
          kind: 'JobSet',
          metadata: { name: 'gpu-training', uid: jobSetUid },
        });
        // Step 3b: Workload found by JobSet UID
        mockListWorkloads.mockResolvedValueOnce([expectedWorkload]);

        const result = await getWorkloadForJob(mockTrainJob);
        expect(result).toEqual(expectedWorkload);
        // Verify the 3rd listWorkloads call used the JobSet UID
        expect(mockListWorkloads).toHaveBeenCalledTimes(3);
        expect(mockListWorkloads).toHaveBeenNthCalledWith(
          3,
          mockTrainJob.metadata.namespace,
          `kueue.x-k8s.io/job-uid=${jobSetUid}`,
        );
      });

      it('should return null when JobSet is not found', async () => {
        mockListWorkloads.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
        mockK8sGetResource.mockRejectedValueOnce(new Error('Not found'));

        const result = await getWorkloadForJob(mockTrainJob);
        expect(result).toBeNull();
      });

      it('should return null when JobSet exists but has no matching workload', async () => {
        mockListWorkloads
          .mockResolvedValueOnce([]) // UID lookup
          .mockResolvedValueOnce([]) // name lookup
          .mockResolvedValueOnce([]); // JobSet UID lookup
        mockK8sGetResource.mockResolvedValueOnce({
          apiVersion: 'jobset.x-k8s.io/v1alpha2',
          kind: 'JobSet',
          metadata: { name: 'gpu-training', uid: jobSetUid },
        });

        const result = await getWorkloadForJob(mockTrainJob);
        expect(result).toBeNull();
      });

      it('should NOT attempt JobSet fallback for RayJob', async () => {
        const rayJob = { ...mockTrainJob, kind: 'RayJob' };
        mockListWorkloads.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

        const result = await getWorkloadForJob(rayJob);
        expect(result).toBeNull();
        expect(mockK8sGetResource).not.toHaveBeenCalled();
      });
    });
  });

  describe('patchWorkloadActiveState', () => {
    const mockWorkload = mockWorkloadK8sResource({
      k8sName: 'test-workload',
      namespace: 'test-namespace',
    });

    it('should use replace operation when active exists', async () => {
      const updatedWorkload = mockWorkloadK8sResource({
        k8sName: 'test-workload',
        namespace: 'test-namespace',
      });
      updatedWorkload.spec.active = false;
      mockK8sPatchResource.mockResolvedValue(updatedWorkload);

      const result = await patchWorkloadActiveState(mockWorkload, true);

      expect(mockK8sPatchResource).toHaveBeenCalledWith(
        expect.objectContaining({
          model: WorkloadModel,
          queryOptions: expect.objectContaining({
            name: 'test-workload',
            ns: 'test-namespace',
          }),
          patches: [
            {
              op: 'replace',
              path: '/spec/active',
              value: false, // isPaused=true means active=false
            },
          ],
        }),
      );
      expect(result).toEqual(updatedWorkload);
    });

    it('should use add operation when active is undefined', async () => {
      const workloadWithoutActive = mockWorkloadK8sResource({
        k8sName: 'test-workload',
        namespace: 'test-namespace',
      });
      delete workloadWithoutActive.spec.active;
      const updatedWorkload = mockWorkloadK8sResource({
        k8sName: 'test-workload',
        namespace: 'test-namespace',
      });
      mockK8sPatchResource.mockResolvedValue(updatedWorkload);

      const result = await patchWorkloadActiveState(workloadWithoutActive, false);

      expect(mockK8sPatchResource).toHaveBeenCalledWith(
        expect.objectContaining({
          patches: [
            {
              op: 'add',
              path: '/spec/active',
              value: true, // isPaused=false means active=true
            },
          ],
        }),
      );
      expect(result).toEqual(updatedWorkload);
    });

    it('should set active=true when isPaused=false', async () => {
      mockK8sPatchResource.mockResolvedValue(mockWorkload);

      await patchWorkloadActiveState(mockWorkload, false);

      expect(mockK8sPatchResource).toHaveBeenCalledWith(
        expect.objectContaining({
          patches: [expect.objectContaining({ value: true })],
        }),
      );
    });

    it('should set active=false when isPaused=true', async () => {
      mockK8sPatchResource.mockResolvedValue(mockWorkload);

      await patchWorkloadActiveState(mockWorkload, true);

      expect(mockK8sPatchResource).toHaveBeenCalledWith(
        expect.objectContaining({
          patches: [expect.objectContaining({ value: false })],
        }),
      );
    });

    it('should handle patch errors', async () => {
      const error = new Error('Patch failed');
      mockK8sPatchResource.mockRejectedValue(error);

      await expect(patchWorkloadActiveState(mockWorkload, true)).rejects.toThrow('Patch failed');
    });
  });
});
