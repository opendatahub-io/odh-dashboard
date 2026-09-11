import { ContainerResourceAttributes, ResourceFlavorKind } from '@odh-dashboard/k8s-core';
import {
  buildCohortOnlyQuotaTree,
  buildQuotaUtilsTestTree,
  makeCQ,
  makeCohort,
} from './quotaHierarchyFixtures';
import {
  CQDcgmResult,
  QUOTA_NODE_TYPE,
  QUOTA_USAGE_METER_VARIANT,
  QuotaSelection,
  ClusterQueueWorkloadRow,
  QuotaUsageWorkloadStatus,
  QuotaUsageWorkloadStatuses,
  QuotaUsageWorkloadTypes,
} from '../../types';
import {
  buildQuotaUsageAcceleratorRows,
  buildQuotaUsageMeterSegments,
  buildQuotaUsageSummary,
  collectAcceleratorClusterQueuesFromSelection,
  collectBorrowingClusterQueuesFromNode,
  formatQuotaUsageWorkloadSummary,
  resolveBorrowSourceCohortName,
  summarizeQuotaUsageWorkloads,
} from '../quotaUsageAggregation';
import { buildQuotaHierarchyTree } from '../buildQuotaHierarchyTree';

const GPU_RESOURCE = 'nvidia.com/gpu' as ContainerResourceAttributes;

const makeGpuCQWithFlavor = (
  name: string,
  {
    cohortName,
    flavorName = 'gpu-flavor',
    gpuProduct = 'NVIDIA A100',
    nominal = 8,
    used = 0,
    borrowed = 0,
    admitted = 0,
    pending = 0,
  }: {
    cohortName?: string;
    flavorName?: string;
    gpuProduct?: string;
    nominal?: number;
    used?: number;
    borrowed?: number;
    admitted?: number;
    pending?: number;
  } = {},
) => {
  const cq = makeCQ(name, cohortName, String(nominal));
  const resourceGroup = cq.spec.resourceGroups?.[0];
  if (resourceGroup) {
    resourceGroup.flavors[0].name = flavorName;
  }
  cq.status = {
    ...cq.status,
    admittedWorkloads: admitted,
    pendingWorkloads: pending,
    flavorsUsage: [
      {
        name: flavorName,
        resources: [
          {
            name: GPU_RESOURCE,
            total: String(used),
            borrowed: String(borrowed),
          },
        ],
      },
    ],
  };
  return { cq, rf: { name: flavorName, gpuProduct } as Parameters<typeof makeResourceFlavor>[0] };
};

const makeResourceFlavor = ({
  name,
  gpuProduct,
}: {
  name: string;
  gpuProduct?: string;
}): ResourceFlavorKind =>
  ({
    apiVersion: 'kueue.x-k8s.io/v1beta2',
    kind: 'ResourceFlavor',
    metadata: { name },
    spec: {
      nodeLabels: gpuProduct ? { 'nvidia.com/gpu.product': gpuProduct } : {},
    },
  } as unknown as ResourceFlavorKind);

describe('collectAcceleratorClusterQueuesFromSelection', () => {
  const tree = buildQuotaUtilsTestTree();

  it('should return single CQ when selection type is clusterQueue', () => {
    const selection: QuotaSelection = {
      type: QUOTA_NODE_TYPE.clusterQueue,
      clusterQueueName: 'prod-serving',
      path: ['production', 'inference-edge', 'prod-serving'],
      clusterQueue: makeCQ('prod-serving', 'inference-edge'),
    };

    const result = collectAcceleratorClusterQueuesFromSelection(tree, selection);
    expect(result).toHaveLength(1);
    expect(result[0].metadata?.name).toBe('prod-serving');
  });

  it('should return all descendant CQ nodes when selection type is cohort', () => {
    const selection: QuotaSelection = {
      type: QUOTA_NODE_TYPE.cohort,
      cohortName: 'production',
      path: ['production'],
    };

    const result = collectAcceleratorClusterQueuesFromSelection(tree, selection);
    expect(result.map((cq) => cq.metadata?.name)).toEqual(['prod-serving']);
  });

  it('should not include CQs from sibling cohort branches', () => {
    const nestedTree = buildQuotaHierarchyTree(
      [
        makeCohort('production'),
        makeCohort('inference-edge', 'production'),
        makeCohort('research'),
      ],
      [makeCQ('prod-serving', 'inference-edge'), makeCQ('ml-training', 'research')],
    );
    const selection: QuotaSelection = {
      type: QUOTA_NODE_TYPE.cohort,
      cohortName: 'production',
      path: ['production'],
    };

    const result = collectAcceleratorClusterQueuesFromSelection(nestedTree, selection);
    expect(result.map((cq) => cq.metadata?.name)).toEqual(['prod-serving']);
  });

  it('should return unassigned CQ children when selection type is unassigned', () => {
    const selection: QuotaSelection = {
      type: QUOTA_NODE_TYPE.unassigned,
      path: ['Unassigned'],
    };

    const result = collectAcceleratorClusterQueuesFromSelection(tree, selection);
    expect(result).toHaveLength(1);
    expect(result[0].metadata?.name).toBe('legacy-batch');
  });

  it('should apply filterAcceleratorCQs and skip CPU-only queues', () => {
    const cpuOnly = makeCQ('cpu-only', 'cohort-1', '0');
    cpuOnly.spec.resourceGroups = [
      {
        coveredResources: ['cpu'],
        flavors: [{ name: 'cpu-flavor', resources: [{ name: 'cpu', nominalQuota: '4' }] }],
      },
    ] as typeof cpuOnly.spec.resourceGroups;
    const treeWithCpu = buildQuotaHierarchyTree(
      [makeCohort('cohort-1')],
      [cpuOnly, makeCQ('gpu-cq', 'cohort-1')],
    );
    const selection: QuotaSelection = {
      type: QUOTA_NODE_TYPE.cohort,
      cohortName: 'cohort-1',
      path: ['cohort-1'],
    };

    expect(collectAcceleratorClusterQueuesFromSelection(treeWithCpu, selection)).toHaveLength(1);
  });

  it('should return empty array when cohort node has no GPU CQs', () => {
    const selection: QuotaSelection = {
      type: QUOTA_NODE_TYPE.cohort,
      cohortName: 'missing',
      path: ['missing'],
    };

    expect(collectAcceleratorClusterQueuesFromSelection(tree, selection)).toEqual([]);
  });
});

describe('buildQuotaUsageSummary', () => {
  it('should sum admitted and pending workloads across member CQs', () => {
    const { cq, rf } = makeGpuCQWithFlavor('cq-a', { admitted: 2, pending: 1, used: 3 });
    const summary = buildQuotaUsageSummary([cq], [makeResourceFlavor(rf)], undefined, false);

    expect(summary.admittedWorkloads).toBe(2);
    expect(summary.pendingWorkloads).toBe(1);
  });

  it('should set totalUsed and totalNominal from CRD helpers', () => {
    const { cq, rf } = makeGpuCQWithFlavor('cq-a', { nominal: 8, used: 5 });
    const summary = buildQuotaUsageSummary([cq], [makeResourceFlavor(rf)], undefined, false);

    expect(summary.totalUsed).toBe(5);
    expect(summary.totalNominal).toBe(8);
    expect(summary.capacityDisplayNominal).toBe(8);
  });

  it('should set isOverQuota when used exceeds nominal', () => {
    const { cq, rf } = makeGpuCQWithFlavor('cq-a', { nominal: 8, used: 10 });
    const summary = buildQuotaUsageSummary([cq], [makeResourceFlavor(rf)], undefined, false);

    expect(summary.isOverQuota).toBe(true);
  });

  it('should set isOverQuota when borrowed count is greater than zero', () => {
    const { cq, rf } = makeGpuCQWithFlavor('cq-a', {
      nominal: 8,
      used: 8,
      borrowed: 2,
      cohortName: 'cohort-1',
    });
    const summary = buildQuotaUsageSummary([cq], [makeResourceFlavor(rf)], undefined, false);

    expect(summary.isOverQuota).toBe(true);
    expect(summary.isBorrowing).toBe(true);
    expect(summary.showBorrowingInfo).toBe(true);
  });

  it('should mark borrowing as enabled from configured accelerator limits without active borrowing', () => {
    const { cq, rf } = makeGpuCQWithFlavor('cq-a', { cohortName: 'cohort-1' });
    const resourceGroup = cq.spec.resourceGroups?.[0];
    if (!resourceGroup) {
      throw new Error('Expected GPU resource group');
    }
    resourceGroup.flavors[0].resources[0].borrowingLimit = '2';
    const summary = buildQuotaUsageSummary([cq], [makeResourceFlavor(rf)], undefined, false);

    expect(summary.borrowingEnabled).toBe(true);
    expect(summary.isBorrowing).toBe(false);
  });

  it('should not mark borrowing as enabled for a standalone queue without limits', () => {
    const { cq, rf } = makeGpuCQWithFlavor('cq-a');
    const summary = buildQuotaUsageSummary([cq], [makeResourceFlavor(rf)], undefined, false);

    expect(summary.borrowingEnabled).toBe(false);
  });

  it('should compute computeUtilization and memoryUtilization via resolveCQDcgmUtilization', () => {
    const { cq, rf } = makeGpuCQWithFlavor('cq-a', { gpuProduct: 'NVIDIA H100', used: 4 });
    const dcgmByModel = new Map<string, CQDcgmResult>([
      ['nvidia h100', { computePercentage: 60, memoryPercentage: 70 }],
    ]);

    const summary = buildQuotaUsageSummary([cq], [makeResourceFlavor(rf)], dcgmByModel, true);
    expect(summary.computeUtilization).toBe(60);
    expect(summary.memoryUtilization).toBe(70);
  });

  it('should mark needsAttention when isOverQuota', () => {
    const { cq, rf } = makeGpuCQWithFlavor('cq-a', {
      nominal: 12,
      used: 14,
      borrowed: 2,
      cohortName: 'platform-production',
    });
    const summary = buildQuotaUsageSummary([cq], [makeResourceFlavor(rf)], undefined, false);

    expect(summary.workloadSummaryLine).toContain('needs attention');
  });

  it('should handle pure borrower CQ capacity denominator', () => {
    const { cq, rf } = makeGpuCQWithFlavor('burst', {
      nominal: 0,
      used: 6,
      cohortName: 'cohort-1',
    });
    const summary = buildQuotaUsageSummary([cq], [makeResourceFlavor(rf)], undefined, false);

    expect(summary.capacityDisplayNominal).toBe(6);
  });

  it('should suppress borrowing info when CQ has no cohortName', () => {
    const { cq, rf } = makeGpuCQWithFlavor('legacy', { nominal: 8, used: 10, borrowed: 2 });
    const summary = buildQuotaUsageSummary([cq], [makeResourceFlavor(rf)], undefined, false);

    expect(summary.showBorrowingInfo).toBe(false);
  });
});

describe('collectBorrowingClusterQueuesFromNode', () => {
  it('should list descendant cluster queues that are borrowing', () => {
    const tree = buildQuotaHierarchyTree(
      [makeCohort('production'), makeCohort('platform-production', 'production')],
      [
        makeGpuCQWithFlavor('high-priority-compute', {
          cohortName: 'platform-production',
          nominal: 12,
          used: 14,
          borrowed: 2,
        }).cq,
      ],
    );
    const cohortNode = tree[0].children.find((node) => node.name === 'platform-production');
    expect(cohortNode).toBeDefined();
    if (!cohortNode) {
      return;
    }

    const borrowingClusterQueues = collectBorrowingClusterQueuesFromNode(tree, cohortNode);

    expect(borrowingClusterQueues).toEqual([
      {
        clusterQueueName: 'high-priority-compute',
        borrowedCount: 2,
        path: ['production', 'platform-production', 'high-priority-compute'],
      },
    ]);
  });
});

describe('buildQuotaUsageAcceleratorRows', () => {
  it('should map per-model used/nominal/borrowed for single CQ', () => {
    const { cq, rf } = makeGpuCQWithFlavor('cq-a', { nominal: 8, used: 5, borrowed: 1 });
    const rows = buildQuotaUsageAcceleratorRows([cq], [makeResourceFlavor(rf)], undefined);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      model: 'NVIDIA A100',
      used: 5,
      nominal: 8,
      borrowed: 1,
    });
  });

  it('should merge rows by model name when aggregating cohort', () => {
    const a = makeGpuCQWithFlavor('cq-a', {
      flavorName: 'a100-a',
      gpuProduct: 'NVIDIA H100',
      nominal: 8,
      used: 4,
    });
    const b = makeGpuCQWithFlavor('cq-b', {
      flavorName: 'a100-b',
      gpuProduct: 'NVIDIA H100',
      nominal: 4,
      used: 2,
    });

    const rows = buildQuotaUsageAcceleratorRows(
      [a.cq, b.cq],
      [makeResourceFlavor(a.rf), makeResourceFlavor({ name: 'a100-b', gpuProduct: 'NVIDIA H100' })],
      undefined,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].used).toBe(6);
    expect(rows[0].nominal).toBe(12);
  });

  it('should attach per-row computePercentage and memoryPercentage from dcgmByModel', () => {
    const { cq, rf } = makeGpuCQWithFlavor('cq-a', { gpuProduct: 'NVIDIA L40S' });
    const dcgmByModel = new Map<string, CQDcgmResult>([
      ['nvidia l40s', { computePercentage: 45, memoryPercentage: 43 }],
    ]);

    const rows = buildQuotaUsageAcceleratorRows([cq], [makeResourceFlavor(rf)], dcgmByModel);
    expect(rows[0].computePercentage).toBe(45);
    expect(rows[0].memoryPercentage).toBe(43);
  });

  it('should leave utilization undefined when model absent from DCGM map', () => {
    const { cq, rf } = makeGpuCQWithFlavor('cq-a', { gpuProduct: 'NVIDIA L40S' });
    const rows = buildQuotaUsageAcceleratorRows([cq], [makeResourceFlavor(rf)], new Map());

    expect(rows[0].computePercentage).toBeUndefined();
    expect(rows[0].memoryPercentage).toBeUndefined();
  });

  it('should sort rows by model name alphabetically', () => {
    const h100 = makeGpuCQWithFlavor('cq-h', { flavorName: 'h100', gpuProduct: 'NVIDIA H100' });
    const l40s = makeGpuCQWithFlavor('cq-l', { flavorName: 'l40s', gpuProduct: 'NVIDIA L40S' });

    const rows = buildQuotaUsageAcceleratorRows(
      [h100.cq, l40s.cq],
      [makeResourceFlavor(h100.rf), makeResourceFlavor(l40s.rf)],
      undefined,
    );

    expect(rows.map((row) => row.model)).toEqual(['NVIDIA H100', 'NVIDIA L40S']);
  });

  it('should use ResourceFlavor name when no GPU product label resolves', () => {
    const { cq, rf } = makeGpuCQWithFlavor('cq-a');
    const rows = buildQuotaUsageAcceleratorRows(
      [cq],
      [makeResourceFlavor({ name: rf.name })],
      undefined,
    );
    expect(rows).toEqual([
      {
        model: 'gpu-flavor',
        used: 0,
        nominal: 8,
        borrowed: 0,
        computePercentage: undefined,
        memoryPercentage: undefined,
      },
    ]);
  });
});

describe('buildQuotaUsageMeterSegments', () => {
  it('should compute blue segment as min(used, capacity)', () => {
    const segments = buildQuotaUsageMeterSegments(QUOTA_USAGE_METER_VARIANT.capacity, 5, 8);
    expect(segments.withinQuotaValue).toBe(5);
    expect(segments.overQuotaValue).toBe(0);
    expect(segments.valueLabel).toBe('5/8');
  });

  it('should compute red segment when over quota', () => {
    const segments = buildQuotaUsageMeterSegments(QUOTA_USAGE_METER_VARIANT.capacity, 14, 12);
    expect(segments.withinQuotaValue).toBe(12);
    expect(segments.overQuotaValue).toBe(2);
    expect(segments.isOverQuota).toBe(true);
  });

  it('should format utilization valueLabel as rounded percentage or 0% when telemetry is unavailable', () => {
    expect(
      buildQuotaUsageMeterSegments(QUOTA_USAGE_METER_VARIANT.utilization, 0, 100, 67).valueLabel,
    ).toBe('67%');
    expect(
      buildQuotaUsageMeterSegments(QUOTA_USAGE_METER_VARIANT.utilization, 0, 100, undefined)
        .valueLabel,
    ).toBe('0%');
    expect(
      buildQuotaUsageMeterSegments(QUOTA_USAGE_METER_VARIANT.utilization, 0, 100, undefined)
        .withinQuotaValue,
    ).toBe(0);
  });
});

describe('formatQuotaUsageWorkloadSummary', () => {
  it('should omit needs attention when within quota', () => {
    expect(formatQuotaUsageWorkloadSummary(2, 1, false, 0)).toBe('2 active, 1 pending');
  });
});

describe('summarizeQuotaUsageWorkloads', () => {
  const workload = (status: QuotaUsageWorkloadStatus): ClusterQueueWorkloadRow => ({
    name: status,
    namespace: 'test',
    project: 'test',
    clusterQueue: 'default',
    type: QuotaUsageWorkloadTypes.Unknown,
    status,
    localQueue: 'default',
    accelerators: 1,
    queuePosition: undefined,
  });

  it('counts active and waiting statuses while excluding terminal statuses', () => {
    const summary = summarizeQuotaUsageWorkloads([
      workload(QuotaUsageWorkloadStatuses.Admitted),
      workload(QuotaUsageWorkloadStatuses.Running),
      workload(QuotaUsageWorkloadStatuses.Pending),
      workload(QuotaUsageWorkloadStatuses.Queued),
      workload(QuotaUsageWorkloadStatuses.Inadmissible),
      workload(QuotaUsageWorkloadStatuses.AdmissionCheck),
      workload(QuotaUsageWorkloadStatuses.BlockedOnPreemptionGates),
      workload(QuotaUsageWorkloadStatuses.Requeued),
      workload(QuotaUsageWorkloadStatuses.Complete),
      workload(QuotaUsageWorkloadStatuses.Failed),
      workload(QuotaUsageWorkloadStatuses.Preempted),
      workload(QuotaUsageWorkloadStatuses.Evicted),
    ]);

    expect(summary).toEqual({
      admittedWorkloads: 2,
      pendingWorkloads: 4,
      workloadSummaryLine: '2 active, 4 pending, 5 needs attention',
    });
  });

  it('returns zero counts for no workloads', () => {
    expect(summarizeQuotaUsageWorkloads([])).toEqual({
      admittedWorkloads: 0,
      pendingWorkloads: 0,
      workloadSummaryLine: '0 active, 0 pending',
    });
  });
});

describe('resolveBorrowSourceCohortName', () => {
  it('should return parent segment from cluster queue path', () => {
    const selection: QuotaSelection = {
      type: QUOTA_NODE_TYPE.clusterQueue,
      clusterQueueName: 'high-priority-compute',
      path: ['production', 'platform-production', 'high-priority-compute'],
      clusterQueue: makeCQ('high-priority-compute', 'platform-production'),
    };

    expect(resolveBorrowSourceCohortName(selection)).toBe('platform-production');
  });
});

describe('nested cohort aggregation integration', () => {
  it('should recursively collect CQs from nested cohort selection', () => {
    const tree = buildCohortOnlyQuotaTree();
    const selection: QuotaSelection = {
      type: QUOTA_NODE_TYPE.cohort,
      cohortName: 'production',
      path: ['production'],
    };

    expect(collectAcceleratorClusterQueuesFromSelection(tree, selection)).toHaveLength(1);
  });
});
