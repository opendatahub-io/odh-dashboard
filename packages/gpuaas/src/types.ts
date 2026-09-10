import { ClusterQueueKind, CohortKind, ContainerResourceAttributes } from '@odh-dashboard/k8s-core';

export const QUOTA_NODE_TYPE = {
  unassigned: 'unassigned',
  cohort: 'cohort',
  clusterQueue: 'clusterQueue',
} as const;

export type QuotaNodeType = (typeof QUOTA_NODE_TYPE)[keyof typeof QUOTA_NODE_TYPE];

export type QuotaTreeNode = {
  id: string;
  name: string;
  type: QuotaNodeType;
  children: QuotaTreeNode[];
  clusterQueue?: ClusterQueueKind;
  cohortName?: string;
  selectable: boolean;
};

export type QuotaSelection =
  | { type: 'unassigned'; path: string[] }
  | { type: 'cohort'; cohortName: string; path: string[] }
  | {
      type: 'clusterQueue';
      clusterQueueName: string;
      path: string[];
      clusterQueue: ClusterQueueKind;
    };

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
  RayJob: 'Ray job',
  Serve: 'Serve',
  RayCluster: 'Ray cluster',
  Unknown: 'Unknown',
} as const;

export type QuotaUsageWorkloadType =
  (typeof QuotaUsageWorkloadTypes)[keyof typeof QuotaUsageWorkloadTypes];

/**
 * UXD Quota usage workloads table — Status column values.
 * All Kueue workload statuses; mapped 1:1 from KueueWorkloadStatus via mapKueueStatusToQuotaUsageStatus.
 */
export const QuotaUsageWorkloadStatuses = {
  Queued: 'Queued',
  Failed: 'Failed',
  Preempted: 'Preempted',
  Evicted: 'Evicted',
  Requeued: 'Requeued',
  Inadmissible: 'Inadmissible',
  AdmissionCheck: 'Admission check',
  BlockedOnPreemptionGates: 'Blocked',
  Running: 'Running',
  Admitted: 'Admitted',
  Complete: 'Complete',
} as const;

export type QuotaUsageWorkloadStatus =
  (typeof QuotaUsageWorkloadStatuses)[keyof typeof QuotaUsageWorkloadStatuses];

/** Statuses for which queue position is fetched via the Kueue Visibility API. */
export const QUOTA_USAGE_STATUSES_WITH_QUEUE_POSITION: QuotaUsageWorkloadStatus[] = [
  QuotaUsageWorkloadStatuses.Queued,
  QuotaUsageWorkloadStatuses.Inadmissible,
];

/** Statuses indicating the workload has passed Kueue admission. */
export const QUOTA_USAGE_STATUSES_PAST_ADMISSION: QuotaUsageWorkloadStatus[] = [
  QuotaUsageWorkloadStatuses.Admitted,
  QuotaUsageWorkloadStatuses.Running,
  QuotaUsageWorkloadStatuses.Complete,
];

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
