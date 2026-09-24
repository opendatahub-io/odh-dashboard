import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { useProjects } from '@odh-dashboard/internal/api/k8s/projects';
import useFetch from '@odh-dashboard/ui-core/hooks/useFetch';
import useClusterQueueWorkloadsData from '../useClusterQueueWorkloadsData';
import { useKueueNamespaceWorkloadCache } from '../KueueNamespaceWorkloadCacheContext';
import {
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
}));

const useProjectsMock = jest.mocked(useProjects);
const useFetchMock = jest.mocked(useFetch);
const useKueueNamespaceWorkloadCacheMock = jest.mocked(useKueueNamespaceWorkloadCache);
const fetchQueuePositionsMock = jest.mocked(fetchQueuePositions);

const kueueProject = mockProjectK8sResource({ k8sName: 'dsp-1', enableKueue: true });
const emptyCache = {
  namespaceData: [],
  hardwareProfileByKey: new Map(),
  hardwareProfilesForMatching: [],
};

const mockCacheWithTwoQueues = {
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
            admission: { clusterQueue: 'gpu-cq', podSetAssignments: [] },
            conditions: [
              {
                type: 'QuotaReserved',
                status: 'True',
                reason: 'QuotaReserved',
                message: 'Quota reserved',
                lastTransitionTime: '2026-01-01T00:00:00Z',
              },
              {
                type: 'Admitted',
                status: 'True',
                reason: 'Admitted',
                message: 'Admitted',
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

const mockUseFetchDefaults = (): void => {
  useFetchMock.mockImplementation((callback, initialValue) => {
    void Promise.resolve(callback({ signal: new AbortController().signal })).catch(() => undefined);
    return { data: initialValue, loaded: true, error: undefined, refresh: jest.fn() };
  });
};

describe('useClusterQueueWorkloadsData', () => {
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

  it('returns loading until namespace workload cache is loaded', () => {
    useKueueNamespaceWorkloadCacheMock.mockReturnValue({
      cache: emptyCache,
      loaded: false,
      enrichmentReady: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useClusterQueueWorkloadsData)(['gpu-cq']);
    expect(renderResult.result.current.loaded).toBe(false);
  });

  it('maps workloads for all requested cluster queues from the shared cache', () => {
    useKueueNamespaceWorkloadCacheMock.mockReturnValue({
      cache: mockCacheWithTwoQueues,
      loaded: true,
      enrichmentReady: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useClusterQueueWorkloadsData)(['gpu-cq', 'other-cq']);

    expect(renderResult.result.current.workloadsByClusterQueue.get('gpu-cq')).toHaveLength(1);
    expect(renderResult.result.current.workloadsByClusterQueue.get('other-cq')).toHaveLength(0);
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
