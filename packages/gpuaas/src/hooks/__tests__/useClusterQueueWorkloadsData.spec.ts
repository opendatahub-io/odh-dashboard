import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { useProjects } from '@odh-dashboard/internal/api/k8s/projects';
import useFetch from '@odh-dashboard/ui-core/hooks/useFetch';
import { QuotaUsageWorkloadStatuses, QuotaUsageWorkloadTypes } from '../../types';
import useClusterQueueWorkloadsData from '../useClusterQueueWorkloadsData';
import { fetchWorkloadsForClusterQueues } from '../../utils/clusterQueueWorkloads';

jest.mock('@odh-dashboard/internal/api/k8s/projects', () => ({
  useProjects: jest.fn(),
}));

jest.mock('@odh-dashboard/ui-core/hooks/useFetch', () => ({
  __esModule: true,
  default: jest.fn(),
  NotReadyError: class NotReadyError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'NotReadyError';
    }
  },
}));

jest.mock('../../utils/clusterQueueWorkloads', () => ({
  ...jest.requireActual('../../utils/clusterQueueWorkloads'),
  fetchWorkloadsForClusterQueues: jest.fn(),
}));

const useProjectsMock = jest.mocked(useProjects);
const useFetchMock = jest.mocked(useFetch);
const fetchWorkloadsForClusterQueuesMock = jest.mocked(fetchWorkloadsForClusterQueues);

const kueueProject = mockProjectK8sResource({ k8sName: 'dsp-1', enableKueue: true });

describe('useClusterQueueWorkloadsData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useProjectsMock.mockReturnValue([[kueueProject], true, undefined]);
    useFetchMock.mockImplementation((callback) => {
      void callback({ signal: new AbortController().signal });
      return {
        data: { mode: 'clusterQueues', workloadsByClusterQueue: new Map() },
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      };
    });
  });

  it('returns loading until projects and workloads are loaded', () => {
    useProjectsMock.mockReturnValue([[], false, undefined]);
    useFetchMock.mockReturnValue({
      data: { mode: 'clusterQueues', workloadsByClusterQueue: new Map() },
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useClusterQueueWorkloadsData)(['gpu-cq']);
    expect(renderResult.result.current.loaded).toBe(false);
  });

  it('fetches workloads once for all cluster queues', () => {
    const workloadsByClusterQueue = new Map([
      [
        'gpu-cq',
        [
          {
            name: 'wl-1',
            namespace: 'dsp-1',
            project: 'dsp-1',
            clusterQueue: 'gpu-cq',
            type: QuotaUsageWorkloadTypes.Workbench,
            status: QuotaUsageWorkloadStatuses.Queued,
            localQueue: 'user-queue',
            accelerators: 1,
            queuePosition: 2,
          },
        ],
      ],
    ]);

    fetchWorkloadsForClusterQueuesMock.mockResolvedValue(workloadsByClusterQueue);
    useFetchMock.mockImplementation((callback) => {
      void callback({ signal: new AbortController().signal });
      return {
        data: { mode: 'clusterQueues', workloadsByClusterQueue },
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      };
    });

    const renderResult = testHook(useClusterQueueWorkloadsData)(['gpu-cq', 'other-cq']);
    expect(fetchWorkloadsForClusterQueuesMock).toHaveBeenCalledWith(
      ['gpu-cq', 'other-cq'],
      ['dsp-1'],
      expect.any(Map),
      false,
    );
    expect(renderResult.result.current.workloadsByClusterQueue.get('gpu-cq')).toHaveLength(1);
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('returns empty map when no cluster queues are provided', () => {
    const renderResult = testHook(useClusterQueueWorkloadsData)([]);
    expect(renderResult.result.current.workloadsByClusterQueue.size).toBe(0);
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('surfaces project watch errors', () => {
    const error = new Error('projects failed');
    useProjectsMock.mockReturnValue([[], true, error]);

    const renderResult = testHook(useClusterQueueWorkloadsData)(['gpu-cq']);
    expect(renderResult.result.current.error).toBe(error);
  });
});
