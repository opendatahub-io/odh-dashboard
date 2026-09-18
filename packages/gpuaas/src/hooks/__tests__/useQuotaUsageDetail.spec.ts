import { testHook } from '@odh-dashboard/jest-config/hooks';
import { ResourceFlavorKind } from '@odh-dashboard/k8s-core';
import { QUOTA_NODE_TYPE, QuotaSelection, QuotaTreeNode } from '../../types';
import { buildQuotaUtilsTestTree, makeCQ } from '../../utils/__tests__/quotaHierarchyFixtures';
import useCQDcgmMetrics from '../useCQDcgmMetrics';
import useResourceFlavors from '../useResourceFlavors';
import useQuotaUsageDetail from '../useQuotaUsageDetail';

jest.mock('../useResourceFlavors', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../useCQDcgmMetrics', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const useResourceFlavorsMock = jest.mocked(useResourceFlavors);
const useCQDcgmMetricsMock = jest.mocked(useCQDcgmMetrics);

const mockTree = buildQuotaUtilsTestTree();
const mockFlavors = [
  {
    apiVersion: 'kueue.x-k8s.io/v1beta2',
    kind: 'ResourceFlavor',
    metadata: { name: 'gpu-flavor' },
    spec: { nodeLabels: { 'nvidia.com/gpu.product': 'NVIDIA A100' } },
  },
] as ResourceFlavorKind[];

const cqSelection: QuotaSelection = {
  type: QUOTA_NODE_TYPE.clusterQueue,
  clusterQueueName: 'prod-serving',
  path: ['production', 'inference-edge', 'prod-serving'],
  clusterQueue: makeCQ('prod-serving', 'inference-edge'),
};

const cohortSelection: QuotaSelection = {
  type: QUOTA_NODE_TYPE.cohort,
  cohortName: 'production',
  path: ['production'],
};

const mockDcgmByModel = new Map([['nvidia a100', { computePercentage: 72, memoryPercentage: 65 }]]);

describe('useQuotaUsageDetail', () => {
  const refreshFlavors = jest.fn().mockResolvedValue([]);
  const refreshDcgm = jest.fn().mockResolvedValue([null, null]);

  beforeEach(() => {
    jest.clearAllMocks();
    useResourceFlavorsMock.mockReturnValue({
      data: mockFlavors,
      loaded: true,
      error: undefined,
      refresh: refreshFlavors,
    });
    useCQDcgmMetricsMock.mockReturnValue({
      byModel: mockDcgmByModel,
      loaded: true,
      dcgmAvailable: true,
      error: undefined,
      refresh: refreshDcgm,
    });
  });

  it('returns undefined detail when selection is missing', () => {
    const renderResult = testHook(useQuotaUsageDetail)(mockTree, undefined);
    expect(renderResult.result.current.detail).toBeUndefined();
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('returns undefined detail while resource flavors are loading', () => {
    useResourceFlavorsMock.mockReturnValue({
      data: [],
      loaded: false,
      error: undefined,
      refresh: refreshFlavors,
    });

    const renderResult = testHook(useQuotaUsageDetail)(mockTree, cqSelection);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.detail).toBeUndefined();
  });

  it('builds detail for a cluster queue selection', () => {
    const renderResult = testHook(useQuotaUsageDetail)(mockTree, cqSelection);
    expect(renderResult.result.current.detail?.summary).toBeDefined();
    expect(renderResult.result.current.detail?.acceleratorRows.length).toBeGreaterThan(0);
    expect(renderResult.result.current.detail?.showKueueProjectsLink).toBe(true);
    expect(renderResult.result.current.detail?.clusterQueueName).toBe('prod-serving');
  });

  it('aggregates descendant cluster queues for cohort selection', () => {
    const renderResult = testHook(useQuotaUsageDetail)(mockTree, cohortSelection);
    expect(renderResult.result.current.detail?.showKueueProjectsLink).toBe(false);
    expect(renderResult.result.current.detail?.clusterQueueName).toBeUndefined();
    expect(renderResult.result.current.detail?.acceleratorRows.length).toBeGreaterThan(0);
  });

  it('returns undefined detail when selection resolves to no accelerator cluster queues', () => {
    const emptyTree: QuotaTreeNode[] = [
      {
        id: 'cohort-empty',
        name: 'empty',
        type: QUOTA_NODE_TYPE.cohort,
        cohortName: 'empty',
        selectable: true,
        children: [],
      },
    ];
    const selection: QuotaSelection = {
      type: QUOTA_NODE_TYPE.cohort,
      cohortName: 'empty',
      path: ['empty'],
    };

    const renderResult = testHook(useQuotaUsageDetail)(emptyTree, selection);
    expect(renderResult.result.current.detail).toBeUndefined();
  });

  it('surfaces resource flavor errors', () => {
    const error = new Error('flavors failed');
    useResourceFlavorsMock.mockReturnValue({
      data: [],
      loaded: true,
      error,
      refresh: refreshFlavors,
    });

    const renderResult = testHook(useQuotaUsageDetail)(mockTree, cqSelection);
    expect(renderResult.result.current.error).toBe(error);
  });

  it('surfaces DCGM errors', () => {
    const error = new Error('dcgm failed');
    useCQDcgmMetricsMock.mockReturnValue({
      byModel: new Map(),
      loaded: true,
      dcgmAvailable: false,
      error,
      refresh: refreshDcgm,
    });

    const renderResult = testHook(useQuotaUsageDetail)(mockTree, cqSelection);
    expect(renderResult.result.current.error).toBe(error);
  });

  it('refreshDetailData refreshes flavors and DCGM metrics', async () => {
    const renderResult = testHook(useQuotaUsageDetail)(mockTree, cqSelection);
    await renderResult.result.current.refreshDetailData();
    expect(refreshFlavors).toHaveBeenCalledTimes(1);
    expect(refreshDcgm).toHaveBeenCalledTimes(1);
  });
});
