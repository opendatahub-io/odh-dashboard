import { k8sDeleteResource, k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { RayJobModel } from '@odh-dashboard/internal/api/models/kubeflow';
import { deleteRayJob, updateRayJobNumNodes } from '../rayJobs';
import { mockRayJobK8sResource } from '../../__mocks__/mockRayJobK8sResource';

jest.mock('@openshift/dynamic-plugin-sdk-utils');

const mockK8sDeleteResource = jest.mocked(k8sDeleteResource);
const mockK8sPatchResource = jest.mocked(k8sPatchResource);

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

  describe('updateRayJobNumNodes', () => {
    const baseJob = mockRayJobK8sResource({ name: 'my-ray-job', namespace: 'my-namespace' });

    beforeEach(() => {
      jest.clearAllMocks();
      mockK8sPatchResource.mockResolvedValue(baseJob);
    });

    it('should patch replicas for a single worker group', async () => {
      const job = {
        ...baseJob,
        spec: {
          ...baseJob.spec,
          rayClusterSpec: {
            headGroupSpec: { template: {} },
            workerGroupSpecs: [{ groupName: 'workers', replicas: 2, template: {} }],
          },
        },
      };

      await updateRayJobNumNodes(job, [{ groupName: 'workers', replicas: 5 }]);

      expect(mockK8sPatchResource).toHaveBeenCalledWith(
        expect.objectContaining({
          model: RayJobModel,
          queryOptions: expect.objectContaining({ name: 'my-ray-job', ns: 'my-namespace' }),
          patches: [
            {
              op: 'replace',
              path: '/spec/rayClusterSpec/workerGroupSpecs/0/replicas',
              value: 5,
            },
          ],
        }),
      );
    });

    it('should also patch minReplicas and maxReplicas when they exist on the spec', async () => {
      const job = {
        ...baseJob,
        spec: {
          ...baseJob.spec,
          rayClusterSpec: {
            headGroupSpec: { template: {} },
            workerGroupSpecs: [
              { groupName: 'workers', replicas: 2, minReplicas: 1, maxReplicas: 4, template: {} },
            ],
          },
        },
      };

      await updateRayJobNumNodes(job, [{ groupName: 'workers', replicas: 3 }]);

      expect(mockK8sPatchResource).toHaveBeenCalledWith(
        expect.objectContaining({
          patches: [
            { op: 'replace', path: '/spec/rayClusterSpec/workerGroupSpecs/0/replicas', value: 3 },
            {
              op: 'replace',
              path: '/spec/rayClusterSpec/workerGroupSpecs/0/minReplicas',
              value: 3,
            },
            {
              op: 'replace',
              path: '/spec/rayClusterSpec/workerGroupSpecs/0/maxReplicas',
              value: 3,
            },
          ],
        }),
      );
    });

    it('should omit minReplicas/maxReplicas patches when fields are undefined on spec', async () => {
      const job = {
        ...baseJob,
        spec: {
          ...baseJob.spec,
          rayClusterSpec: {
            headGroupSpec: { template: {} },
            workerGroupSpecs: [{ groupName: 'workers', replicas: 2, template: {} }],
          },
        },
      };

      await updateRayJobNumNodes(job, [{ groupName: 'workers', replicas: 4 }]);

      const callArgs = mockK8sPatchResource.mock.calls[0][0] as { patches: unknown[] };
      expect(callArgs.patches).toHaveLength(1);
      expect(callArgs.patches[0]).toMatchObject({
        path: '/spec/rayClusterSpec/workerGroupSpecs/0/replicas',
      });
    });

    it('should patch multiple worker groups at correct indices', async () => {
      const job = {
        ...baseJob,
        spec: {
          ...baseJob.spec,
          rayClusterSpec: {
            headGroupSpec: { template: {} },
            workerGroupSpecs: [
              { groupName: 'cpu-workers', replicas: 1, template: {} },
              { groupName: 'gpu-workers', replicas: 2, template: {} },
            ],
          },
        },
      };

      await updateRayJobNumNodes(job, [
        { groupName: 'cpu-workers', replicas: 3 },
        { groupName: 'gpu-workers', replicas: 0 },
      ]);

      const callArgs = mockK8sPatchResource.mock.calls[0][0] as {
        patches: { path: string; value: number }[];
      };
      expect(callArgs.patches).toEqual([
        { op: 'replace', path: '/spec/rayClusterSpec/workerGroupSpecs/0/replicas', value: 3 },
        { op: 'replace', path: '/spec/rayClusterSpec/workerGroupSpecs/1/replicas', value: 0 },
      ]);
    });

    it('should skip groups whose replica count has not changed', async () => {
      const job = {
        ...baseJob,
        spec: {
          ...baseJob.spec,
          rayClusterSpec: {
            headGroupSpec: { template: {} },
            workerGroupSpecs: [
              { groupName: 'cpu-workers', replicas: 1, template: {} },
              { groupName: 'gpu-workers', replicas: 2, template: {} },
            ],
          },
        },
      };

      await updateRayJobNumNodes(job, [
        { groupName: 'cpu-workers', replicas: 3 },
        { groupName: 'gpu-workers', replicas: 2 },
      ]);

      const callArgs = mockK8sPatchResource.mock.calls[0][0] as {
        patches: { path: string; value: number }[];
      };
      expect(callArgs.patches).toEqual([
        { op: 'replace', path: '/spec/rayClusterSpec/workerGroupSpecs/0/replicas', value: 3 },
      ]);
    });

    it('should skip unknown group names and not call the API', async () => {
      const job = {
        ...baseJob,
        spec: {
          ...baseJob.spec,
          rayClusterSpec: {
            headGroupSpec: { template: {} },
            workerGroupSpecs: [{ groupName: 'workers', replicas: 2, template: {} }],
          },
        },
      };

      const result = await updateRayJobNumNodes(job, [{ groupName: 'nonexistent', replicas: 5 }]);

      expect(mockK8sPatchResource).not.toHaveBeenCalled();
      expect(result).toBe(job);
    });

    it('should produce no patches for a job with no worker groups and not call the API', async () => {
      const job = {
        ...baseJob,
        spec: {
          ...baseJob.spec,
          rayClusterSpec: {
            headGroupSpec: { template: {} },
            workerGroupSpecs: [],
          },
        },
      };

      const result = await updateRayJobNumNodes(job, []);

      expect(mockK8sPatchResource).not.toHaveBeenCalled();
      expect(result).toBe(job);
    });

    it('should use add op when replicas field is not yet set on the worker group', async () => {
      const job = {
        ...baseJob,
        spec: {
          ...baseJob.spec,
          rayClusterSpec: {
            headGroupSpec: { template: {} },
            workerGroupSpecs: [{ groupName: 'workers', template: {} }],
          },
        },
      };

      await updateRayJobNumNodes(job, [{ groupName: 'workers', replicas: 2 }]);

      const callArgs = mockK8sPatchResource.mock.calls[0][0] as {
        patches: { op: string; path: string; value: number }[];
      };
      expect(callArgs.patches).toContainEqual({
        op: 'add',
        path: '/spec/rayClusterSpec/workerGroupSpecs/0/replicas',
        value: 2,
      });
    });

    it('should propagate API errors', async () => {
      const job = {
        ...baseJob,
        spec: {
          ...baseJob.spec,
          rayClusterSpec: {
            headGroupSpec: { template: {} },
            workerGroupSpecs: [{ groupName: 'workers', replicas: 2, template: {} }],
          },
        },
      };
      mockK8sPatchResource.mockRejectedValue(new Error('API failure'));

      await expect(
        updateRayJobNumNodes(job, [{ groupName: 'workers', replicas: 3 }]),
      ).rejects.toThrow('API failure');
    });
  });
});
