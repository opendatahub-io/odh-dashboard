import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { useProjects } from '@odh-dashboard/internal/api/k8s/projects';
import useFetch from '@odh-dashboard/ui-core/hooks/useFetch';
import { QuotaUsageWorkloadStatuses, QuotaUsageWorkloadTypes } from '../../types';
import useWorkloadRows from '../useWorkloadRows';
import { useKueueNamespaceWorkloadCache } from '../KueueNamespaceWorkloadCacheContext';
import {
  fetchNamespaceWorkloads,
  fetchQueuePositions,
  type KueueNamespaceWorkloadCache,
} from '../../utils/clusterQueueWorkloads';

jest.mock('@odh-dashboard/internal/api/k8s/projects', () => ({
  useProjects: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/redux/selectors/project', () => ({
  useDashboardNamespace: jest.fn(() => ({ dashboardNamespace: 'redhat-ods-applications' })),
}));

jest.mock('../KueueNamespaceWorkloadCacheContext', () => ({
  useKueueNamespaceWorkloadCache: jest.fn(),
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
  fetchQueuePositions: jest.fn(),
  fetchNamespaceWorkloads: jest.fn(),
}));

const useProjectsMock = jest.mocked(useProjects);
const useFetchMock = jest.mocked(useFetch);
const useKueueNamespaceWorkloadCacheMock = jest.mocked(useKueueNamespaceWorkloadCache);
const fetchQueuePositionsMock = jest.mocked(fetchQueuePositions);
const fetchNamespaceWorkloadsMock = jest.mocked(fetchNamespaceWorkloads);

const kueueProject = mockProjectK8sResource({ k8sName: 'dsp-1', enableKueue: true });

const gpuCqRow = {
  name: 'wl-1',
  namespace: 'dsp-1',
  project: 'dsp-1',
  clusterQueue: 'gpu-cq',
  type: QuotaUsageWorkloadTypes.Workbench,
  status: QuotaUsageWorkloadStatuses.Queued,
  localQueue: 'user-queue',
  accelerators: 1,
  queuePosition: undefined,
};

const mockCacheWithGpuCq = {
  namespaceData: [
    {
      namespace: 'dsp-1',
      workloads: [
        {
          apiVersion: 'kueue.x-k8s.io/v1beta2' as const,
          kind: 'Workload' as const,
          metadata: { name: 'wl-1', namespace: 'dsp-1' },
          spec: {
            active: true,
            queueName: 'user-queue',
            podSets: [
              {
                count: 1,
                name: 'main',
                template: {
                  metadata: {},
                  spec: {
                    containers: [
                      {
                        name: 'main',
                        image: 'test-image',
                        env: [],
                        resources: { requests: { 'nvidia.com/gpu': '1' } },
                      },
                    ],
                  },
                },
              },
            ],
          },
          status: {
            conditions: [
              {
                type: 'QuotaReserved',
                status: 'False',
                reason: 'Pending',
                message: 'Waiting',
                lastTransitionTime: '2026-01-01T00:00:00Z',
              },
            ],
          },
        },
      ],
      localQueues: [
        {
          apiVersion: 'kueue.x-k8s.io/v1beta2' as const,
          kind: 'LocalQueue' as const,
          metadata: { name: 'user-queue', namespace: 'dsp-1' },
          spec: { clusterQueue: 'gpu-cq' },
        },
      ],
      pods: [],
      statefulSets: [],
      inferenceServices: [],
      jobKindByUid: new Map(),
    },
  ],
} as unknown as KueueNamespaceWorkloadCache;

const emptyCache = {
  namespaceData: [],
  hardwareProfileByKey: new Map(),
  hardwareProfilesForMatching: [],
};

// Distinguish which useFetch call is which by inspecting the initial value shape (Map -> queue
// positions fetch; { mode: 'namespace' | 'clusterQueues', ... } -> namespace fetch).
const mockUseFetchDefaults = (): void => {
  useFetchMock.mockImplementation((callback, initialValue) => {
    void Promise.resolve(callback({ signal: new AbortController().signal })).catch(() => undefined);
    if (initialValue instanceof Map) {
      return { data: initialValue, loaded: true, error: undefined, refresh: jest.fn() };
    }
    return { data: initialValue, loaded: true, error: undefined, refresh: jest.fn() };
  });
};

describe('useWorkloadRows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useProjectsMock.mockReturnValue([[kueueProject], true, undefined]);
    useKueueNamespaceWorkloadCacheMock.mockReturnValue({
      cache: emptyCache,
      loaded: true,
      enrichmentReady: true,
      error: undefined,
      refresh: jest.fn(),
    });
    fetchQueuePositionsMock.mockResolvedValue(new Map());
    mockUseFetchDefaults();
  });

  it('maps workloads for cluster queues synchronously from the shared cache', () => {
    useKueueNamespaceWorkloadCacheMock.mockReturnValue({
      cache: mockCacheWithGpuCq,
      loaded: true,
      enrichmentReady: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useWorkloadRows)({
      mode: 'clusterQueues',
      clusterQueueNames: ['gpu-cq'],
    });

    expect(renderResult.result.current.data.mode).toBe('clusterQueues');
    if (renderResult.result.current.data.mode === 'clusterQueues') {
      expect(renderResult.result.current.data.workloadsByClusterQueue.get('gpu-cq')).toHaveLength(
        1,
      );
    }
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('enriches queued rows with queue positions asynchronously', () => {
    useKueueNamespaceWorkloadCacheMock.mockReturnValue({
      cache: mockCacheWithGpuCq,
      loaded: true,
      enrichmentReady: true,
      error: undefined,
      refresh: jest.fn(),
    });
    useFetchMock.mockImplementation((callback, initialValue) => {
      void Promise.resolve(callback({ signal: new AbortController().signal })).catch(
        () => undefined,
      );
      if (initialValue instanceof Map) {
        return {
          data: new Map([['dsp-1/wl-1', 3]]),
          loaded: true,
          error: undefined,
          refresh: jest.fn(),
        };
      }
      return { data: initialValue, loaded: true, error: undefined, refresh: jest.fn() };
    });

    const renderResult = testHook(useWorkloadRows)({
      mode: 'clusterQueues',
      clusterQueueNames: ['gpu-cq'],
    });

    expect(renderResult.result.current.data.mode).toBe('clusterQueues');
    if (renderResult.result.current.data.mode === 'clusterQueues') {
      const rows = renderResult.result.current.data.workloadsByClusterQueue.get('gpu-cq') ?? [];
      expect(rows[0].queuePosition).toBe(3);
      expect(rows[0].status).toBe(QuotaUsageWorkloadStatuses.Queued);
    }
  });

  it('fetches all workloads for a namespace scope', () => {
    const workloads = [{ ...gpuCqRow, status: QuotaUsageWorkloadStatuses.Admitted }];

    fetchNamespaceWorkloadsMock.mockResolvedValue(workloads);
    useFetchMock.mockImplementation((callback, initialValue) => {
      void Promise.resolve(callback({ signal: new AbortController().signal })).catch(
        () => undefined,
      );
      if (initialValue instanceof Map) {
        return { data: initialValue, loaded: true, error: undefined, refresh: jest.fn() };
      }
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

    expect(fetchNamespaceWorkloadsMock).toHaveBeenCalledWith(
      'dsp-1',
      'DSP 1',
      'redhat-ods-applications',
    );
    expect(renderResult.result.current.data.mode).toBe('namespace');
    if (renderResult.result.current.data.mode === 'namespace') {
      expect(renderResult.result.current.data.workloads).toHaveLength(1);
    }
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('waits for namespace workload cache in clusterQueues scope', () => {
    useKueueNamespaceWorkloadCacheMock.mockReturnValue({
      cache: emptyCache,
      loaded: false,
      enrichmentReady: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useWorkloadRows)({
      mode: 'clusterQueues',
      clusterQueueNames: ['gpu-cq'],
    });
    expect(renderResult.result.current.loaded).toBe(false);
  });

  it('returns loaded empty result for clusterQueues scope with no cluster queues', () => {
    const renderResult = testHook(useWorkloadRows)({
      mode: 'clusterQueues',
      clusterQueueNames: [],
    });

    expect(renderResult.result.current.data).toEqual({
      mode: 'clusterQueues',
      workloadsByClusterQueue: new Map(),
    });
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
  });

  it('surfaces project and cache errors for clusterQueues scope', () => {
    const cacheError = new Error('cache failed');
    useKueueNamespaceWorkloadCacheMock.mockReturnValue({
      cache: emptyCache,
      loaded: true,
      enrichmentReady: true,
      error: cacheError,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useWorkloadRows)({
      mode: 'clusterQueues',
      clusterQueueNames: ['gpu-cq'],
    });
    expect(renderResult.result.current.error).toBe(cacheError);
  });

  it('surfaces namespace load errors from the cache payload', () => {
    const namespaceLoadError = new Error('dsp-2 failed');
    useKueueNamespaceWorkloadCacheMock.mockReturnValue({
      cache: { ...emptyCache, namespaceLoadError },
      loaded: true,
      enrichmentReady: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useWorkloadRows)({
      mode: 'clusterQueues',
      clusterQueueNames: ['gpu-cq'],
    });
    expect(renderResult.result.current.error).toBe(namespaceLoadError);
  });

  it('refreshes namespace cache and lets position fetch follow cache refresh', async () => {
    const refreshCache = jest.fn().mockResolvedValue(mockCacheWithGpuCq);
    fetchQueuePositionsMock.mockResolvedValue(new Map());
    useKueueNamespaceWorkloadCacheMock.mockReturnValue({
      cache: mockCacheWithGpuCq,
      loaded: true,
      enrichmentReady: true,
      error: undefined,
      refresh: refreshCache,
    });
    useFetchMock.mockImplementation((callback, initialValue) => {
      void Promise.resolve(callback({ signal: new AbortController().signal })).catch(
        () => undefined,
      );
      if (initialValue instanceof Map) {
        return {
          data: initialValue,
          loaded: true,
          error: undefined,
          refresh: jest.fn(),
        };
      }
      return { data: initialValue, loaded: true, error: undefined, refresh: jest.fn() };
    });

    const renderResult = testHook(useWorkloadRows)({
      mode: 'clusterQueues',
      clusterQueueNames: ['gpu-cq'],
    });

    const refreshed = await renderResult.result.current.refresh();
    expect(refreshCache).toHaveBeenCalled();
    expect(fetchQueuePositionsMock).toHaveBeenCalledTimes(1);
    expect(refreshed?.mode).toBe('clusterQueues');
    if (refreshed?.mode === 'clusterQueues') {
      expect(refreshed.workloadsByClusterQueue.get('gpu-cq')?.[0]?.name).toBe('wl-1');
    }
  });
});
