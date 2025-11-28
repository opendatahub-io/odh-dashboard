import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { PodModel } from '@odh-dashboard/internal/api/models/index';
import { PodKind } from '@odh-dashboard/internal/k8sTypes';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import { getPodsForTrainJob } from '../pods';
import { mockTrainJobK8sResource } from '../../__mocks__/mockTrainJobK8sResource';

jest.mock('@openshift/dynamic-plugin-sdk-utils');

const mockK8sListResource = jest.mocked(k8sListResource);

describe('Pods API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPodsForTrainJob', () => {
    const mockJob = mockTrainJobK8sResource({
      name: 'test-job',
      namespace: 'test-namespace',
    });

    const mockPods: PodKind[] = [
      {
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: {
          name: 'test-job-pod-1',
          namespace: 'test-namespace',
          labels: {
            'jobset.sigs.k8s.io/jobset-name': 'test-job',
          },
        },
        spec: {
          containers: [],
        },
      },
      {
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: {
          name: 'test-job-pod-2',
          namespace: 'test-namespace',
          labels: {
            'jobset.sigs.k8s.io/jobset-name': 'test-job',
          },
        },
        spec: {
          containers: [],
        },
      },
    ];

    it('should list pods with correct label selector', async () => {
      mockK8sListResource.mockResolvedValue(mockK8sResourceList([...mockPods]));

      const result = await getPodsForTrainJob(mockJob);

      expect(mockK8sListResource).toHaveBeenCalledWith({
        model: PodModel,
        queryOptions: {
          ns: 'test-namespace',
          queryParams: {
            labelSelector: 'jobset.sigs.k8s.io/jobset-name=test-job',
          },
        },
      });
      expect(result).toEqual(mockPods);
    });

    it('should return empty array when no pods found', async () => {
      mockK8sListResource.mockResolvedValue(mockK8sResourceList([]));

      const result = await getPodsForTrainJob(mockJob);

      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
      const error = new Error('List failed');
      mockK8sListResource.mockRejectedValue(error);

      await expect(getPodsForTrainJob(mockJob)).rejects.toThrow('List failed');
    });

    it('should use job name in label selector', async () => {
      const jobWithDifferentName = mockTrainJobK8sResource({
        name: 'different-job',
        namespace: 'test-namespace',
      });
      mockK8sListResource.mockResolvedValue(mockK8sResourceList([]));

      await getPodsForTrainJob(jobWithDifferentName);

      expect(mockK8sListResource).toHaveBeenCalledWith(
        expect.objectContaining({
          queryOptions: expect.objectContaining({
            queryParams: {
              labelSelector: 'jobset.sigs.k8s.io/jobset-name=different-job',
            },
          }),
        }),
      );
    });
  });
});
