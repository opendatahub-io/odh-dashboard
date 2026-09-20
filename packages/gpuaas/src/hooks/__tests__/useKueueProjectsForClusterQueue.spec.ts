import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { getModelServingProjects } from '@odh-dashboard/internal/api/k8s/projects';
import { listAllLocalQueues } from '@odh-dashboard/internal/api/k8s/localQueues';
import useKueueProjectsForClusterQueue from '../useKueueProjectsForClusterQueue';

jest.mock('@odh-dashboard/internal/api/k8s/projects', () => ({
  getModelServingProjects: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/api/k8s/localQueues', () => ({
  listAllLocalQueues: jest.fn(),
}));

const getModelServingProjectsMock = jest.mocked(getModelServingProjects);
const listAllLocalQueuesMock = jest.mocked(listAllLocalQueues);

describe('useKueueProjectsForClusterQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns Kueue-managed data science projects linked to the cluster queue', async () => {
    listAllLocalQueuesMock.mockResolvedValue([
      {
        apiVersion: 'kueue.x-k8s.io/v1beta2',
        kind: 'LocalQueue',
        metadata: { name: 'lq-1', namespace: 'legacy-jobs' },
        spec: { clusterQueue: 'gpu-cq' },
      },
      {
        apiVersion: 'kueue.x-k8s.io/v1beta2',
        kind: 'LocalQueue',
        metadata: { name: 'lq-2', namespace: 'other-cq-project' },
        spec: { clusterQueue: 'other-cq' },
      },
    ]);
    getModelServingProjectsMock.mockResolvedValue([
      mockProjectK8sResource({ k8sName: 'legacy-jobs', enableKueue: true }),
      mockProjectK8sResource({ k8sName: 'other-cq-project', enableKueue: true }),
      mockProjectK8sResource({ k8sName: 'not-kueue-managed', isDSProject: true }),
    ]);

    const renderResult = testHook(useKueueProjectsForClusterQueue)('gpu-cq');
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual([{ name: 'legacy-jobs' }]);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
  });

  it('excludes projects without the Kueue-managed label', async () => {
    listAllLocalQueuesMock.mockResolvedValue([
      {
        apiVersion: 'kueue.x-k8s.io/v1beta2',
        kind: 'LocalQueue',
        metadata: { name: 'lq-1', namespace: 'legacy-jobs' },
        spec: { clusterQueue: 'gpu-cq' },
      },
    ]);
    getModelServingProjectsMock.mockResolvedValue([
      mockProjectK8sResource({ k8sName: 'legacy-jobs', enableKueue: false }),
    ]);

    const renderResult = testHook(useKueueProjectsForClusterQueue)('gpu-cq');
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual([]);
    expect(renderResult.result.current.loaded).toBe(true);
  });
});
