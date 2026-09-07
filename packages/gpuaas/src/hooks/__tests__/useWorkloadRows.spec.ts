import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { useProjects } from '@odh-dashboard/internal/api/k8s/projects';
import useFetch from '@odh-dashboard/ui-core/hooks/useFetch';
import { QuotaUsageWorkloadStatuses, QuotaUsageWorkloadTypes } from '../../types';
import useWorkloadRows from '../useWorkloadRows';
import {
  fetchNamespaceWorkloads,
  fetchWorkloadsForClusterQueues,
} from '../../utils/clusterQueueWorkloads';

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
  fetchNamespaceWorkloads: jest.fn(),
}));

const useProjectsMock = jest.mocked(useProjects);
const useFetchMock = jest.mocked(useFetch);
const fetchWorkloadsForClusterQueuesMock = jest.mocked(fetchWorkloadsForClusterQueues);
const fetchNamespaceWorkloadsMock = jest.mocked(fetchNamespaceWorkloads);

const kueueProject = mockProjectK8sResource({ k8sName: 'dsp-1', enableKueue: true });

describe('useWorkloadRows', () => {
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

  it('fetches workloads for all cluster queues in clusterQueues scope', () => {
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

    const renderResult = testHook(useWorkloadRows)({
      mode: 'clusterQueues',
      clusterQueueNames: ['gpu-cq', 'other-cq'],
    });

    expect(fetchWorkloadsForClusterQueuesMock).toHaveBeenCalledWith(
      ['gpu-cq', 'other-cq'],
      ['dsp-1'],
      expect.any(Map),
      false,
    );
    expect(renderResult.result.current.data.mode).toBe('clusterQueues');
    if (renderResult.result.current.data.mode === 'clusterQueues') {
      expect(renderResult.result.current.data.workloadsByClusterQueue.get('gpu-cq')).toHaveLength(
        1,
      );
    }
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('fetches all workloads for a namespace scope', () => {
    const workloads = [
      {
        name: 'wl-1',
        namespace: 'dsp-1',
        project: 'DSP 1',
        clusterQueue: 'gpu-cq',
        type: QuotaUsageWorkloadTypes.Serve,
        status: QuotaUsageWorkloadStatuses.Admitted,
        localQueue: 'user-queue',
        accelerators: 1,
        queuePosition: undefined,
      },
    ];

    fetchNamespaceWorkloadsMock.mockResolvedValue(workloads);
    useFetchMock.mockImplementation((callback) => {
      void callback({ signal: new AbortController().signal });
      return {
        data: { mode: 'namespace', workloads },
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      };
    });

    const renderResult = testHook(useWorkloadRows)({
      mode: 'namespace',
      namespace: 'dsp-1',
      projectDisplayName: 'DSP 1',
    });

    expect(fetchNamespaceWorkloadsMock).toHaveBeenCalledWith('dsp-1', 'DSP 1', false);
    expect(renderResult.result.current.data.mode).toBe('namespace');
    if (renderResult.result.current.data.mode === 'namespace') {
      expect(renderResult.result.current.data.workloads).toHaveLength(1);
    }
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('waits for projects in clusterQueues scope', () => {
    useProjectsMock.mockReturnValue([[], false, undefined]);
    useFetchMock.mockReturnValue({
      data: { mode: 'clusterQueues', workloadsByClusterQueue: new Map() },
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useWorkloadRows)({
      mode: 'clusterQueues',
      clusterQueueNames: ['gpu-cq'],
    });
    expect(renderResult.result.current.loaded).toBe(false);
  });

  it('returns loaded empty result for clusterQueues scope with no cluster queues', async () => {
    useFetchMock.mockImplementation(() => {
      return {
        data: { mode: 'clusterQueues', workloadsByClusterQueue: new Map() },
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      };
    });
    useProjectsMock.mockReturnValue([[], false, new Error('projects failed')]);

    const renderResult = testHook(useWorkloadRows)({
      mode: 'clusterQueues',
      clusterQueueNames: [],
    });

    const fetchCallback = useFetchMock.mock.calls[0][0];
    await expect(fetchCallback({ signal: new AbortController().signal })).resolves.toEqual({
      mode: 'clusterQueues',
      workloadsByClusterQueue: new Map(),
    });
    expect(fetchWorkloadsForClusterQueuesMock).not.toHaveBeenCalled();
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
  });

  it('passes initialPromisePurity to useFetch', () => {
    testHook(useWorkloadRows)({ mode: 'clusterQueues', clusterQueueNames: ['gpu-cq'] });

    expect(useFetchMock).toHaveBeenCalledWith(
      expect.any(Function),
      expect.anything(),
      expect.objectContaining({ initialPromisePurity: true }),
    );
  });
});
