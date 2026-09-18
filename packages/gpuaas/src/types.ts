import { ClusterQueueKind, CohortKind, ContainerResourceAttributes } from '@odh-dashboard/k8s-core';
import { KueueWorkloadStatus } from '@odh-dashboard/k8s-core/kueue/types';

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

/** null = still loading; undefined = loaded but no telemetry data for this model (render as 0%) */
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
  /** TrainJob and RayJob CR-backed training workloads. */
  Train: 'Train',
  /** Generic Job owner workloads (batch jobs), not notebook workbenches. */
  Batch: 'Batch',
  Serve: 'Serve',
  RayCluster: 'Ray cluster',
  /** Unclassified workloads (e.g. pipeline runs without ODH integration). */
  Unknown: 'Unknown',
} as const;

export type QuotaUsageWorkloadType =
  (typeof QuotaUsageWorkloadTypes)[keyof typeof QuotaUsageWorkloadTypes];

/**
 * UXD Quota usage workloads table — Status column values.
 *
 * Kueue Workload condition → column display:
 * | Inadmissible | Inadmissible |
 * | Pending / no admission | Pending (Queued without visibility position) or Queued (+ queue position) |
 * | Admitted, no PodsReady | Admitted |
 * | PodsReady | Running |
 * | Finished | Complete |
 * | Failed / Preempted / Evicted / Requeued / … | same name |
 *
 * Mapped from KueueWorkloadStatus via mapKueueStatusToQuotaUsageStatus; Pending is display-only.
 */
export const QuotaUsageWorkloadStatuses = {
  /** Kueue Queued without a visibility API position yet (pending admission). */
  Pending: 'Pending',
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

/** All UXD status filter options in display order (workloads table toolbar). */
export const QUOTA_USAGE_WORKLOAD_STATUS_FILTER_OPTIONS: QuotaUsageWorkloadStatus[] = [
  QuotaUsageWorkloadStatuses.Pending,
  QuotaUsageWorkloadStatuses.Queued,
  QuotaUsageWorkloadStatuses.Inadmissible,
  QuotaUsageWorkloadStatuses.Admitted,
  QuotaUsageWorkloadStatuses.Running,
  QuotaUsageWorkloadStatuses.Complete,
  QuotaUsageWorkloadStatuses.Failed,
  QuotaUsageWorkloadStatuses.Preempted,
  QuotaUsageWorkloadStatuses.Evicted,
  QuotaUsageWorkloadStatuses.Requeued,
  QuotaUsageWorkloadStatuses.AdmissionCheck,
  QuotaUsageWorkloadStatuses.BlockedOnPreemptionGates,
];

/** Maps UXD display status to Kueue for shared icon/color styling (Pending has no Kueue equivalent). */
export const QUOTA_USAGE_TO_KUEUE_STATUS: Partial<
  Record<QuotaUsageWorkloadStatus, KueueWorkloadStatus>
> = {
  [QuotaUsageWorkloadStatuses.Queued]: KueueWorkloadStatus.Queued,
  [QuotaUsageWorkloadStatuses.Failed]: KueueWorkloadStatus.Failed,
  [QuotaUsageWorkloadStatuses.Preempted]: KueueWorkloadStatus.Preempted,
  [QuotaUsageWorkloadStatuses.Evicted]: KueueWorkloadStatus.Evicted,
  [QuotaUsageWorkloadStatuses.Requeued]: KueueWorkloadStatus.Requeued,
  [QuotaUsageWorkloadStatuses.Inadmissible]: KueueWorkloadStatus.Inadmissible,
  [QuotaUsageWorkloadStatuses.AdmissionCheck]: KueueWorkloadStatus.AdmissionCheck,
  [QuotaUsageWorkloadStatuses.BlockedOnPreemptionGates]:
    KueueWorkloadStatus.BlockedOnPreemptionGates,
  [QuotaUsageWorkloadStatuses.Running]: KueueWorkloadStatus.Running,
  [QuotaUsageWorkloadStatuses.Admitted]: KueueWorkloadStatus.Admitted,
  [QuotaUsageWorkloadStatuses.Complete]: KueueWorkloadStatus.Complete,
};

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
  /** Formatted from spec.priorityClassRef.name and spec.priority, e.g. "on demand (100)". */
  priority?: string;
  /**
   * Hardware profile display name — resolved from the real HardwareProfile CR when the workload's
   * Pod carries the `opendatahub.io/hardware-profile-name` annotation (e.g. "Research notebook MIG
   * 7g"), or by matching workload resources to a HardwareProfile.
   */
  hardwareProfile?: string;
  /** Accelerator resource identifier for the resolved hardware profile, e.g. "nvidia.com/mig-7g.80gb". */
  hardwareProfileResourceType?: string;
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

/** Aggregated summary metrics for the Quota usage detail panel (RHOAIENG-88178). */
export type QuotaUsageSummary = {
  admittedWorkloads: number;
  pendingWorkloads: number;
  workloadSummaryLine: string;
  totalUsed: number;
  totalNominal: number;
  /** Denominator for capacity meter label (handles pure-borrower fallback). */
  capacityDisplayNominal: number;
  totalBorrowed: number;
  isOverQuota: boolean;
  isBorrowing: boolean;
  /** True when any selected CQ is in a cohort and has accelerator borrowing or lending configured. */
  borrowingEnabled: boolean;
  /** True when any selected CQ belongs to a Kueue cohort and is borrowing. */
  showBorrowingInfo: boolean;
  /** Parent cohort name for borrowing copy (from selection path). */
  borrowSourceCohortName?: string;
  /** Member cluster queues currently borrowing, when viewing a cohort selection. */
  borrowingClusterQueues: QuotaUsageBorrowingClusterQueue[];
  computeUtilization: number | null | undefined;
  memoryUtilization: number | null | undefined;
};

/** A cluster queue borrowing accelerators within the current cohort scope. */
export type QuotaUsageBorrowingClusterQueue = {
  clusterQueueName: string;
  borrowedCount: number;
  path: string[];
};

/** Per-model row for the Accelerator usage table. */
export type QuotaUsageAcceleratorRow = {
  model: string;
  used: number;
  nominal: number;
  borrowed?: number;
  computePercentage: number | null | undefined;
  memoryPercentage: number | null | undefined;
};

export type QuotaUsageMeterVariant = 'capacity' | 'utilization';

export const QUOTA_USAGE_METER_VARIANT = {
  capacity: 'capacity',
  utilization: 'utilization',
} as const satisfies Record<QuotaUsageMeterVariant, QuotaUsageMeterVariant>;

export type QuotaUsageMeterSegments = {
  withinQuotaValue: number;
  overQuotaValue: number;
  capacity: number;
  valueLabel: string;
  isOverQuota: boolean;
};
