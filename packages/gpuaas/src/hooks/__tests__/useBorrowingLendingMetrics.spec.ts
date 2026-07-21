import { ClusterQueueKind } from '@odh-dashboard/k8s-core';
import {
  buildSeries,
  getGpuNominalQuota,
  KueueUsageMetricResult,
} from '../useBorrowingLendingMetrics';

const makeClusterQueue = (name: string, gpuQuota: number): ClusterQueueKind => ({
  apiVersion: 'kueue.x-k8s.io/v1beta2',
  kind: 'ClusterQueue',
  metadata: { name },
  spec: {
    queueingStrategy: 'BestEffortFIFO',
    stopPolicy: 'None',
    namespaceSelector: {},
    resourceGroups: [
      {
        coveredResources: ['nvidia.com/gpu' as never],
        flavors: [
          {
            name: 'gpu-flavor',
            resources: [{ name: 'nvidia.com/gpu' as never, nominalQuota: String(gpuQuota) }],
          },
        ],
      },
    ],
  },
});

const makeResult = (cqName: string, values: [number, string][]): KueueUsageMetricResult => ({
  // eslint-disable-next-line camelcase
  metric: { cluster_queue: cqName },
  values,
});

const makeCQInfoMap = (entries: [string, { nominalQuota: number; cohortName: string }][]) =>
  new Map(entries);

describe('getGpuNominalQuota', () => {
  it('sums nvidia.com/* resources across all flavors and resource groups', () => {
    expect(getGpuNominalQuota(makeClusterQueue('cq-a', 8))).toBe(8);
  });

  it('returns 0 for a CQ with no resource groups', () => {
    const cq = makeClusterQueue('cq-b', 0);
    cq.spec.resourceGroups = [];
    expect(getGpuNominalQuota(cq)).toBe(0);
  });

  it('ignores non-nvidia resources', () => {
    const cq: ClusterQueueKind = {
      apiVersion: 'kueue.x-k8s.io/v1beta2',
      kind: 'ClusterQueue',
      metadata: { name: 'cq-cpu' },
      spec: {
        queueingStrategy: 'BestEffortFIFO',
        stopPolicy: 'None',
        namespaceSelector: {},
        resourceGroups: [
          {
            coveredResources: ['cpu' as never, 'memory' as never],
            flavors: [
              {
                name: 'default',
                resources: [
                  { name: 'cpu' as never, nominalQuota: '100' },
                  { name: 'memory' as never, nominalQuota: '64Gi' },
                ],
              },
            ],
          },
        ],
      },
    };
    expect(getGpuNominalQuota(cq)).toBe(0);
  });
});

describe('buildSeries', () => {
  it('returns empty array for empty prometheus results', () => {
    expect(buildSeries([], new Map())).toEqual([]);
  });

  it('returns one series per matched CQ', () => {
    const series = buildSeries(
      [makeResult('cq-a', [[1700000000, '6']]), makeResult('cq-b', [[1700000000, '1']])],
      makeCQInfoMap([
        ['cq-a', { nominalQuota: 4, cohortName: 'cohort-1' }],
        ['cq-b', { nominalQuota: 2, cohortName: 'cohort-1' }],
      ]),
    );
    expect(series).toHaveLength(2);
  });

  it('skips results whose CQ name is not in the info map', () => {
    const series = buildSeries(
      [makeResult('cq-unknown', [[1700000000, '4']])],
      makeCQInfoMap([['cq-a', { nominalQuota: 4, cohortName: 'cohort-1' }]]),
    );
    expect(series).toHaveLength(0);
  });

  it('maps a prometheus result to a series with correct y, x, and cohortName', () => {
    const ts = 1700000000;
    const series = buildSeries(
      [makeResult('cq-a', [[ts, '6']])],
      makeCQInfoMap([['cq-a', { nominalQuota: 4, cohortName: 'cohort-1' }]]),
    );
    expect(series[0].data[0].y).toBeCloseTo(2); // borrowing: usage(6) - quota(4)
    expect(series[0].data[0].x).toBe(ts * 1000); // seconds → milliseconds
    expect(series[0].cohortName).toBe('cohort-1');
  });

  it.each([
    ['borrowing (usage > quota)', '6', 4, 2],
    ['lending (usage < quota)', '1', 4, -3],
  ])('computes y correctly for %s', (_label, usage, quota, expectedY) => {
    const series = buildSeries(
      [makeResult('cq-a', [[1700000000, usage]])],
      makeCQInfoMap([['cq-a', { nominalQuota: quota, cohortName: 'cohort-1' }]]),
    );
    expect(series[0].data[0].y).toBeCloseTo(expectedY);
  });
});
