import { testHook } from '@odh-dashboard/jest-config/hooks';
import { listClusterQueues } from '@odh-dashboard/internal/api/k8s/clusterQueues';
import { listCohorts } from '@odh-dashboard/internal/api/k8s/cohorts';
import useFetch from '@odh-dashboard/ui-core/hooks/useFetch';
import { ClusterQueueKind, CohortKind } from '@odh-dashboard/k8s-core';
import { INFRASTRUCTURE_REFRESH_INTERVAL } from '../../const';
import { QuotaTreeNode } from '../../types';
import { buildQuotaHierarchyTree } from '../../utils/buildQuotaHierarchyTree';
import useQuotaHierarchy from '../useQuotaHierarchy';

jest.mock('@odh-dashboard/ui-core/hooks/useFetch', () => ({
  __esModule: true,
  default: jest.fn(),
  NotReadyError: class NotReadyError extends Error {
    constructor(reason: string) {
      super(`Not ready yet. ${reason}`);
      this.name = 'NotReadyError';
    }
  },
}));

jest.mock('@odh-dashboard/internal/api/k8s/clusterQueues', () => ({
  listClusterQueues: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/api/k8s/cohorts', () => ({
  listCohorts: jest.fn(),
}));

jest.mock('../../utils/buildQuotaHierarchyTree', () => ({
  buildQuotaHierarchyTree: jest.fn(),
}));

const useFetchMock = jest.mocked(useFetch);
const listClusterQueuesMock = jest.mocked(listClusterQueues);
const listCohortsMock = jest.mocked(listCohorts);
const buildQuotaHierarchyTreeMock = jest.mocked(buildQuotaHierarchyTree);

const mockCohorts = [{ metadata: { name: 'production' } }] as CohortKind[];
const mockClusterQueues = [{ metadata: { name: 'prod-serving' } }] as ClusterQueueKind[];
const mockTree: QuotaTreeNode[] = [
  {
    id: 'cohort-production',
    name: 'production',
    type: 'cohort',
    cohortName: 'production',
    children: [],
    selectable: true,
  },
];

describe('useQuotaHierarchy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFetchMock.mockReturnValue({
      data: { tree: [] },
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });
  });

  it('should register useFetch with empty initial tree and refresh interval', () => {
    testHook(useQuotaHierarchy)(true, true);

    expect(useFetchMock).toHaveBeenCalledWith(
      expect.any(Function),
      { tree: [] },
      {
        refreshRate: INFRASTRUCTURE_REFRESH_INTERVAL,
        initialPromisePurity: true,
      },
    );
  });

  it('should remain not ready while administrative access is loading', async () => {
    testHook(useQuotaHierarchy)(true, false);
    const fetchQuotaHierarchy = useFetchMock.mock.calls[0][0] as () => Promise<unknown>;

    await expect(fetchQuotaHierarchy()).rejects.toMatchObject({ name: 'NotReadyError' });
    expect(listClusterQueuesMock).not.toHaveBeenCalled();
    expect(listCohortsMock).not.toHaveBeenCalled();
  });

  it('should start loading quota data after administrative access resolves', async () => {
    listCohortsMock.mockResolvedValue(mockCohorts);
    listClusterQueuesMock.mockResolvedValue(mockClusterQueues);
    buildQuotaHierarchyTreeMock.mockReturnValue(mockTree);

    const renderResult = testHook(useQuotaHierarchy)(true, false);
    const loadingFetchQuotaHierarchy = useFetchMock.mock.calls[0][0] as () => Promise<unknown>;

    await expect(loadingFetchQuotaHierarchy()).rejects.toMatchObject({ name: 'NotReadyError' });
    expect(listClusterQueuesMock).not.toHaveBeenCalled();
    expect(listCohortsMock).not.toHaveBeenCalled();

    renderResult.rerender(true, true);
    const resolvedFetchQuotaHierarchy = useFetchMock.mock.calls[1][0] as () => Promise<{
      tree: QuotaTreeNode[];
    }>;

    await expect(resolvedFetchQuotaHierarchy()).resolves.toEqual({ tree: mockTree });
    expect(listClusterQueuesMock).toHaveBeenCalledTimes(1);
    expect(listCohortsMock).toHaveBeenCalledTimes(1);
    expect(buildQuotaHierarchyTreeMock).toHaveBeenCalledWith(mockCohorts, mockClusterQueues);
  });

  it('should return an empty tree when administrative access is denied', async () => {
    testHook(useQuotaHierarchy)(false, true);
    const fetchQuotaHierarchy = useFetchMock.mock.calls[0][0] as () => Promise<{
      tree: QuotaTreeNode[];
    }>;

    await expect(fetchQuotaHierarchy()).resolves.toEqual({ tree: [] });
    expect(listClusterQueuesMock).not.toHaveBeenCalled();
    expect(listCohortsMock).not.toHaveBeenCalled();
  });

  it('should list cohorts and cluster queues then build the navigation tree', async () => {
    listCohortsMock.mockResolvedValue(mockCohorts);
    listClusterQueuesMock.mockResolvedValue(mockClusterQueues);
    buildQuotaHierarchyTreeMock.mockReturnValue(mockTree);

    testHook(useQuotaHierarchy)(true, true);
    const fetchQuotaHierarchy = useFetchMock.mock.calls[0][0] as () => Promise<{
      tree: QuotaTreeNode[];
    }>;

    await expect(fetchQuotaHierarchy()).resolves.toEqual({ tree: mockTree });
    expect(listCohortsMock).toHaveBeenCalledTimes(1);
    expect(listClusterQueuesMock).toHaveBeenCalledTimes(1);
    expect(buildQuotaHierarchyTreeMock).toHaveBeenCalledWith(mockCohorts, mockClusterQueues);
  });

  it('should set lastRefreshed once and preserve it during automatic data refresh', () => {
    useFetchMock.mockReturnValue({
      data: { tree: mockTree },
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useQuotaHierarchy)(true, true);
    const initialLastRefreshed = renderResult.result.current.lastRefreshed;
    expect(initialLastRefreshed).toEqual(expect.any(Date));

    useFetchMock.mockReturnValue({
      data: { tree: [] },
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });
    renderResult.rerender(true, true);

    expect(renderResult.result.current.lastRefreshed).toBe(initialLastRefreshed);
  });

  it('should update lastRefreshed after manual refresh succeeds', async () => {
    const refresh = jest.fn().mockResolvedValue({ tree: mockTree });
    useFetchMock.mockReturnValue({
      data: { tree: mockTree },
      loaded: true,
      error: undefined,
      refresh,
    });

    const renderResult = testHook(useQuotaHierarchy)(true, true);
    const initialLastRefreshed = renderResult.result.current.lastRefreshed;

    const refreshPromise = renderResult.result.current.refresh();
    await renderResult.waitForNextUpdate();
    await refreshPromise;

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(renderResult.result.current.lastRefreshed).not.toBe(initialLastRefreshed);
  });
});
