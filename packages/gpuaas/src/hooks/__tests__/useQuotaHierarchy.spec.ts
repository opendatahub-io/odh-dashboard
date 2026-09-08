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
    testHook(useQuotaHierarchy)();

    expect(useFetchMock).toHaveBeenCalledWith(
      expect.any(Function),
      { tree: [] },
      {
        refreshRate: INFRASTRUCTURE_REFRESH_INTERVAL,
      },
    );
  });

  it('should list cohorts and cluster queues then build the navigation tree', async () => {
    listCohortsMock.mockResolvedValue(mockCohorts);
    listClusterQueuesMock.mockResolvedValue(mockClusterQueues);
    buildQuotaHierarchyTreeMock.mockReturnValue(mockTree);

    testHook(useQuotaHierarchy)();
    const fetchQuotaHierarchy = useFetchMock.mock.calls[0][0] as () => Promise<{
      tree: QuotaTreeNode[];
    }>;

    await expect(fetchQuotaHierarchy()).resolves.toEqual({ tree: mockTree });
    expect(listCohortsMock).toHaveBeenCalledTimes(1);
    expect(listClusterQueuesMock).toHaveBeenCalledTimes(1);
    expect(buildQuotaHierarchyTreeMock).toHaveBeenCalledWith(mockCohorts, mockClusterQueues);
  });
});
