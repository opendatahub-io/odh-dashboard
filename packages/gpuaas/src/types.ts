import { ClusterQueueKind, CohortKind, ContainerResourceAttributes } from '@odh-dashboard/k8s-core';

export type CohortState = 'explicit' | 'implicit' | 'standalone';

export type ResourceQuota = {
  name: ContainerResourceAttributes;
  nominalQuota: number;
};

export type FlavorQuota = {
  name: string;
  resources: ResourceQuota[];
};

export type UnifiedCohort = {
  name: string;
  state: CohortState;
  cohortResource?: CohortKind;
  memberClusterQueues: ClusterQueueKind[];
  effectivePool: FlavorQuota[];
};

/** null = still loading; undefined = loaded but no telemetry data for this model */
export type CQDcgmResult = {
  computePercentage: number | null | undefined;
  memoryPercentage: number | null | undefined;
};

export type KueueProject = {
  name: string;
};

/** UXD Quota usage workloads table — Type column values (ODH + Kueue workload taxonomy). */
export const QuotaUsageWorkloadTypes = {
  Workbench: 'Workbench',
  Train: 'Train',
  Serve: 'Serve',
  RayCluster: 'Ray cluster',
  Unknown: 'Unknown',
} as const;

export type QuotaUsageWorkloadType =
  (typeof QuotaUsageWorkloadTypes)[keyof typeof QuotaUsageWorkloadTypes];

/**
 * UXD Quota usage workloads table — Status column values.
 * Mapped from Kueue workload conditions via mapKueueStatusToQuotaUsageStatus.
 */
export const QuotaUsageWorkloadStatuses = {
  Pending: 'Pending',
  Queued: 'Queued',
  Admitted: 'Admitted',
} as const;

export type QuotaUsageWorkloadStatus =
  (typeof QuotaUsageWorkloadStatuses)[keyof typeof QuotaUsageWorkloadStatuses];

/** Row model for the Quota usage tab workloads table (RHOAIENG-88168). */
export type ClusterQueueWorkloadRow = {
  name: string;
  namespace: string;
  project: string;
  /** Admitted cluster queue, or pending local queue's target cluster queue. */
  clusterQueue: string;
  type: QuotaUsageWorkloadType;
  status: QuotaUsageWorkloadStatus;
  localQueue: string;
  accelerators: number;
  /** 1-indexed position in the local queue; undefined when admitted or unavailable. */
  queuePosition: number | undefined;
  /** Formatted from spec.priorityClassRef and spec.priority, e.g. "on-demand (100)". */
  priority?: string;
  /** GPU product from admitted ResourceFlavor assignment, e.g. "NVIDIA-L40S". */
  hardwareProfile?: string;
};

/** Fetch scope for shared workload table data layer. */
export type WorkloadRowsScope =
  | {
      mode: 'clusterQueues';
      clusterQueueNames: string[];
    }
  | {
      mode: 'namespace';
      namespace: string;
      projectDisplayName: string;
    };

export type WorkloadRowsFetchResult =
  | {
      mode: 'clusterQueues';
      workloadsByClusterQueue: Map<string, ClusterQueueWorkloadRow[]>;
    }
  | {
      mode: 'namespace';
      workloads: ClusterQueueWorkloadRow[];
    };
