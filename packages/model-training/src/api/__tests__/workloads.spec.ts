import { k8sPatchResource, k8sDeleteResource } from '@openshift/dynamic-plugin-sdk-utils';
import { WorkloadModel } from '@odh-dashboard/internal/api/models/kueue';
import { listWorkloads } from '@odh-dashboard/internal/api/k8s/workloads';
import { mockWorkloadK8sResource } from '@odh-dashboard/internal/__mocks__/mockWorkloadK8sResource';
import {
  getWorkloadForTrainJob,
  patchWorkloadHibernation,
  deleteWorkloadForTrainJob,
  deleteJobSetForTrainJob,
} from '../workloads';
import { mockTrainJobK8sResource } from '../../__mocks__/mockTrainJobK8sResource';

jest.mock('@openshift/dynamic-plugin-sdk-utils');
jest.mock('@odh-dashboard/internal/api/k8s/workloads');

const mockK8sPatchResource = jest.mocked(k8sPatchResource);
const mockK8sDeleteResource = jest.mocked(k8sDeleteResource);
const mockListWorkloads = jest.mocked(listWorkloads);

describe('Workload API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getWorkloadForTrainJob', () => {
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

      const result = await getWorkloadForTrainJob(mockJob);

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

      const result = await getWorkloadForTrainJob(mockJob);

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

      const result = await getWorkloadForTrainJob(mockJob);

      expect(result).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      mockListWorkloads.mockRejectedValue(new Error('API error'));

      const result = await getWorkloadForTrainJob(mockJob);

      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to fetch workload for TrainJob:',
        expect.any(Error),
      );
    });
  });

  describe('patchWorkloadHibernation', () => {
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

      const result = await patchWorkloadHibernation(mockWorkload, true);

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
              value: false, // isHibernated=true means active=false
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

      const result = await patchWorkloadHibernation(workloadWithoutActive, false);

      expect(mockK8sPatchResource).toHaveBeenCalledWith(
        expect.objectContaining({
          patches: [
            {
              op: 'add',
              path: '/spec/active',
              value: true, // isHibernated=false means active=true
            },
          ],
        }),
      );
      expect(result).toEqual(updatedWorkload);
    });

    it('should set active=true when isHibernated=false', async () => {
      mockK8sPatchResource.mockResolvedValue(mockWorkload);

      await patchWorkloadHibernation(mockWorkload, false);

      expect(mockK8sPatchResource).toHaveBeenCalledWith(
        expect.objectContaining({
          patches: [expect.objectContaining({ value: true })],
        }),
      );
    });

    it('should set active=false when isHibernated=true', async () => {
      mockK8sPatchResource.mockResolvedValue(mockWorkload);

      await patchWorkloadHibernation(mockWorkload, true);

      expect(mockK8sPatchResource).toHaveBeenCalledWith(
        expect.objectContaining({
          patches: [expect.objectContaining({ value: false })],
        }),
      );
    });

    it('should handle patch errors', async () => {
      const error = new Error('Patch failed');
      mockK8sPatchResource.mockRejectedValue(error);

      await expect(patchWorkloadHibernation(mockWorkload, true)).rejects.toThrow('Patch failed');
    });
  });

  describe('deleteWorkloadForTrainJob', () => {
    const mockJob = mockTrainJobK8sResource({
      name: 'test-job',
      namespace: 'test-namespace',
    });

    const mockWorkload = mockWorkloadK8sResource({
      k8sName: 'test-workload',
      namespace: 'test-namespace',
    });

    it('should delete workload if it exists', async () => {
      mockListWorkloads.mockResolvedValue([mockWorkload]);
      const mockStatus = { kind: 'Status', status: 'Success' };
      mockK8sDeleteResource.mockResolvedValue(mockStatus);

      await deleteWorkloadForTrainJob(mockJob);

      expect(mockK8sDeleteResource).toHaveBeenCalledWith(
        expect.objectContaining({
          model: WorkloadModel,
          queryOptions: expect.objectContaining({
            name: 'test-workload',
            ns: 'test-namespace',
          }),
        }),
      );
    });

    it('should handle missing workload gracefully', async () => {
      mockListWorkloads.mockResolvedValue([]);

      await expect(deleteWorkloadForTrainJob(mockJob)).resolves.not.toThrow();
      expect(mockK8sDeleteResource).not.toHaveBeenCalled();
    });

    it('should handle deletion errors gracefully', async () => {
      mockListWorkloads.mockResolvedValue([mockWorkload]);
      mockK8sDeleteResource.mockRejectedValue(new Error('Delete failed'));

      await expect(deleteWorkloadForTrainJob(mockJob)).resolves.not.toThrow();
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('deleteJobSetForTrainJob', () => {
    it('should delete JobSet', async () => {
      const mockStatus = { kind: 'Status', status: 'Success' };
      mockK8sDeleteResource.mockResolvedValue(mockStatus);

      await deleteJobSetForTrainJob('test-job', 'test-namespace');

      expect(mockK8sDeleteResource).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.objectContaining({
            apiGroup: 'jobset.x-k8s.io',
            apiVersion: 'v1alpha2',
            kind: 'JobSet',
            plural: 'jobsets',
          }),
          queryOptions: expect.objectContaining({
            name: 'test-job',
            ns: 'test-namespace',
          }),
        }),
      );
    });

    it('should handle missing JobSet gracefully', async () => {
      mockK8sDeleteResource.mockRejectedValue(new Error('Not found'));

      await expect(deleteJobSetForTrainJob('test-job', 'test-namespace')).resolves.not.toThrow();
      expect(console.warn).toHaveBeenCalled();
    });

    it('should handle deletion errors gracefully', async () => {
      mockK8sDeleteResource.mockRejectedValue(new Error('Delete failed'));

      await expect(deleteJobSetForTrainJob('test-job', 'test-namespace')).resolves.not.toThrow();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('JobSet deletion'),
        expect.any(Error),
      );
    });
  });
});
