import { ClusterQueueKind, ResourceFlavorKind } from '@odh-dashboard/k8s-core';
import {
  filterAcceleratorCQs,
  getAcceleratorBorrowedCount,
  getCQNominalAccelerators,
  getCQUsedAccelerators,
  isAcceleratorBorrowing,
  isAcceleratorResource,
  isInCohort,
  normalizeModelName,
  resolveCQDcgmUtilization,
} from './clusterQueueUtils';
import { ModelGpuCount, resolveHardwareModels, resolvePerModelGpuCounts } from './hardwareModels';
import { findQuotaTreeNode, getQuotaNodePath, nodeIdFromSelection } from './quotaUsageTreeUtils';
import {
  CQDcgmResult,
  QUOTA_NODE_TYPE,
  QUOTA_USAGE_METER_VARIANT,
  QuotaSelection,
  QuotaTreeNode,
  QuotaUsageAcceleratorRow,
  QuotaUsageBorrowingClusterQueue,
  QuotaUsageMeterSegments,
  QuotaUsageMeterVariant,
  QuotaUsageSummary,
  ClusterQueueWorkloadRow,
  QuotaUsageWorkloadStatuses,
  type QuotaUsageWorkloadStatus,
} from '../types';

const collectClusterQueuesFromNode = (node: QuotaTreeNode): ClusterQueueKind[] => {
  if (node.type === QUOTA_NODE_TYPE.clusterQueue) {
    return node.clusterQueue ? [node.clusterQueue] : [];
  }
  return node.children.flatMap(collectClusterQueuesFromNode);
};

/** Collects GPU cluster queues for the current tree selection (recursive for cohorts). */
export const collectAcceleratorClusterQueuesFromSelection = (
  tree: QuotaTreeNode[],
  selection?: QuotaSelection,
): ClusterQueueKind[] => {
  if (!selection) {
    return [];
  }
  const node = findQuotaTreeNode(tree, nodeIdFromSelection(selection));
  if (!node) {
    return [];
  }
  return filterAcceleratorCQs(collectClusterQueuesFromNode(node));
};

/** Lists descendant cluster queues that are actively borrowing within a cohort selection. */
export const collectBorrowingClusterQueuesFromNode = (
  tree: QuotaTreeNode[],
  node: QuotaTreeNode,
): QuotaUsageBorrowingClusterQueue[] => {
  const borrowingClusterQueues: QuotaUsageBorrowingClusterQueue[] = [];

  const visit = (current: QuotaTreeNode): void => {
    if (
      current.type === QUOTA_NODE_TYPE.clusterQueue &&
      current.clusterQueue &&
      isInCohort(current.clusterQueue) &&
      isAcceleratorBorrowing(current.clusterQueue)
    ) {
      const path = getQuotaNodePath(tree, current.id);
      if (path) {
        borrowingClusterQueues.push({
          clusterQueueName: current.name,
          borrowedCount: getAcceleratorBorrowedCount(current.clusterQueue),
          path,
        });
      }
    }
    current.children.forEach(visit);
  };

  visit(node);
  return borrowingClusterQueues.toSorted((a, b) =>
    a.clusterQueueName.localeCompare(b.clusterQueueName),
  );
};

const mergeModelGpuCounts = (countsByCQ: Map<string, ModelGpuCount[]>): ModelGpuCount[] => {
  const totalsByModel = new Map<string, ModelGpuCount>();

  for (const rows of countsByCQ.values()) {
    for (const row of rows) {
      const modelTotals = totalsByModel.get(row.model);
      if (modelTotals) {
        modelTotals.used += row.used;
        modelTotals.nominal += row.nominal;
        if (row.borrowed !== undefined) {
          modelTotals.borrowed = (modelTotals.borrowed ?? 0) + row.borrowed;
        }
      } else {
        totalsByModel.set(row.model, { ...row });
      }
    }
  }

  return [...totalsByModel.values()].toSorted((a, b) => a.model.localeCompare(b.model));
};

const resolveCapacityDisplayNominal = (totalUsed: number, totalNominal: number): number =>
  totalNominal > 0 ? totalNominal : totalUsed;

export const formatQuotaUsageWorkloadSummary = (
  admitted: number,
  pending: number,
  isOverQuota: boolean,
  needsAttentionCount: number,
): string => {
  const base = `${admitted} active, ${pending} pending`;
  if (!isOverQuota) {
    return base;
  }
  if (needsAttentionCount > 0) {
    return `${base}, ${needsAttentionCount} needs attention`;
  }
  return `${base}, needs attention`;
};

export const summarizeQuotaUsageWorkloads = (
  workloads: ClusterQueueWorkloadRow[],
): Pick<QuotaUsageSummary, 'admittedWorkloads' | 'pendingWorkloads' | 'workloadSummaryLine'> => {
  const activeStatuses: QuotaUsageWorkloadStatus[] = [
    QuotaUsageWorkloadStatuses.Admitted,
    QuotaUsageWorkloadStatuses.Running,
  ];
  const pendingStatuses: QuotaUsageWorkloadStatus[] = [
    QuotaUsageWorkloadStatuses.Queued,
    QuotaUsageWorkloadStatuses.Pending,
    QuotaUsageWorkloadStatuses.AdmissionCheck,
    QuotaUsageWorkloadStatuses.Requeued,
  ];
  const needsAttentionStatuses: QuotaUsageWorkloadStatus[] = [
    QuotaUsageWorkloadStatuses.Inadmissible,
    QuotaUsageWorkloadStatuses.BlockedOnPreemptionGates,
    QuotaUsageWorkloadStatuses.Failed,
    QuotaUsageWorkloadStatuses.Preempted,
    QuotaUsageWorkloadStatuses.Evicted,
  ];
  const admittedWorkloads = workloads.filter((workload) =>
    activeStatuses.includes(workload.status),
  ).length;
  const pendingWorkloads = workloads.filter((workload) =>
    pendingStatuses.includes(workload.status),
  ).length;
  const needsAttentionWorkloads = workloads.filter((workload) =>
    needsAttentionStatuses.includes(workload.status),
  ).length;

  return {
    admittedWorkloads,
    pendingWorkloads,
    workloadSummaryLine: formatQuotaUsageWorkloadSummary(
      admittedWorkloads,
      pendingWorkloads,
      needsAttentionWorkloads > 0,
      needsAttentionWorkloads,
    ),
  };
};

export const buildQuotaUsageSummary = (
  clusterQueues: ClusterQueueKind[],
  resourceFlavors: ResourceFlavorKind[],
  dcgmByModel: Map<string, CQDcgmResult> | undefined,
  dcgmAvailable: boolean,
  borrowSourceCohortName?: string,
): QuotaUsageSummary => {
  const totalUsed = clusterQueues.reduce((sum, cq) => sum + getCQUsedAccelerators(cq), 0);
  const totalNominal = clusterQueues.reduce((sum, cq) => sum + getCQNominalAccelerators(cq), 0);
  const totalBorrowed = clusterQueues.reduce((sum, cq) => sum + getAcceleratorBorrowedCount(cq), 0);
  const admittedWorkloads = clusterQueues.reduce(
    (sum, cq) => sum + (cq.status?.admittedWorkloads ?? 0),
    0,
  );
  const pendingWorkloads = clusterQueues.reduce(
    (sum, cq) => sum + (cq.status?.pendingWorkloads ?? 0),
    0,
  );

  const capacityDisplayNominal = resolveCapacityDisplayNominal(totalUsed, totalNominal);
  const isOverQuota = totalUsed > totalNominal || totalBorrowed > 0;
  const isBorrowing = clusterQueues.some((cq) => isAcceleratorBorrowing(cq));
  const borrowingEnabled = clusterQueues.some(
    (cq) =>
      isInCohort(cq) &&
      (cq.spec.resourceGroups ?? []).some((resourceGroup) =>
        resourceGroup.flavors.some((flavor) =>
          flavor.resources.some(
            (resource) =>
              isAcceleratorResource(resource.name) &&
              (resource.borrowingLimit !== undefined || resource.lendingLimit !== undefined),
          ),
        ),
      ),
  );
  const showBorrowingInfo =
    isBorrowing && clusterQueues.some((cq) => isInCohort(cq)) && totalBorrowed > 0;
  const needsAttentionCount = isOverQuota
    ? Math.max(totalBorrowed, Math.max(0, totalUsed - totalNominal))
    : 0;

  const allModels = [
    ...new Set(
      clusterQueues.flatMap(
        (cq) => resolveHardwareModels([cq], resourceFlavors).get(cq.metadata?.name ?? '') ?? [],
      ),
    ),
  ];
  const { computeUtilization, memoryUtilization } =
    dcgmAvailable && dcgmByModel && allModels.length > 0
      ? resolveCQDcgmUtilization(allModels, dcgmByModel)
      : { computeUtilization: undefined, memoryUtilization: undefined };

  return {
    admittedWorkloads,
    pendingWorkloads,
    workloadSummaryLine: formatQuotaUsageWorkloadSummary(
      admittedWorkloads,
      pendingWorkloads,
      isOverQuota,
      needsAttentionCount,
    ),
    totalUsed,
    totalNominal,
    capacityDisplayNominal,
    totalBorrowed,
    isOverQuota,
    isBorrowing,
    borrowingEnabled,
    showBorrowingInfo,
    borrowSourceCohortName,
    borrowingClusterQueues: [],
    computeUtilization,
    memoryUtilization,
  };
};

const resolveRowDcgm = (
  model: string,
  dcgmByModel: Map<string, CQDcgmResult> | undefined,
): Pick<QuotaUsageAcceleratorRow, 'computePercentage' | 'memoryPercentage'> => {
  if (!dcgmByModel) {
    return { computePercentage: undefined, memoryPercentage: undefined };
  }
  const dcgmMetricsForModel = dcgmByModel.get(normalizeModelName(model));
  if (!dcgmMetricsForModel) {
    return { computePercentage: undefined, memoryPercentage: undefined };
  }
  return {
    computePercentage: dcgmMetricsForModel.computePercentage,
    memoryPercentage: dcgmMetricsForModel.memoryPercentage,
  };
};

export const buildQuotaUsageAcceleratorRows = (
  clusterQueues: ClusterQueueKind[],
  resourceFlavors: ResourceFlavorKind[],
  dcgmByModel: Map<string, CQDcgmResult> | undefined,
): QuotaUsageAcceleratorRow[] => {
  const perModelByCQ = resolvePerModelGpuCounts(clusterQueues, resourceFlavors);
  const aggregatedModelRows = mergeModelGpuCounts(perModelByCQ);

  return aggregatedModelRows.map((row) => ({
    model: row.model,
    used: row.used,
    nominal: row.nominal,
    borrowed: row.borrowed,
    ...resolveRowDcgm(row.model, dcgmByModel),
  }));
};

export const buildQuotaUsageMeterSegments = (
  variant: QuotaUsageMeterVariant,
  used: number,
  capacity: number,
  percentage?: number | null,
): QuotaUsageMeterSegments => {
  if (variant === QUOTA_USAGE_METER_VARIANT.utilization) {
    const pct = percentage ?? 0;
    const isOverQuota = pct > 100;
    const withinQuotaValue = isOverQuota ? 100 : Math.max(0, pct);
    const overQuotaValue = isOverQuota ? pct - 100 : 0;
    const valueLabel = percentage === null ? '' : `${Math.round(pct)}%`;

    return {
      withinQuotaValue,
      overQuotaValue,
      capacity: 100,
      valueLabel,
      isOverQuota,
    };
  }

  const displayCapacity = capacity > 0 ? capacity : used;
  const isOverQuota = used > displayCapacity;
  const withinQuotaValue = Math.min(used, displayCapacity);
  const overQuotaValue = Math.max(0, used - displayCapacity);

  return {
    withinQuotaValue,
    overQuotaValue,
    capacity: displayCapacity,
    valueLabel: `${used}/${displayCapacity}`,
    isOverQuota,
  };
};

/** Parent cohort name from breadcrumb path for borrowing copy on cluster queue detail. */
export const resolveBorrowSourceCohortName = (selection?: QuotaSelection): string | undefined => {
  if (!selection || selection.type !== QUOTA_NODE_TYPE.clusterQueue || selection.path.length < 2) {
    return undefined;
  }
  return selection.path[selection.path.length - 2];
};
