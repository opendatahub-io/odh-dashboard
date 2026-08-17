import type { ComponentType, SVGProps } from 'react';
import type { LabelProps } from '@patternfly/react-core';

export enum KueueWorkloadStatus {
  Queued = 'Queued',
  Failed = 'Failed',
  Preempted = 'Preempted',
  Evicted = 'Evicted',
  Requeued = 'Requeued',
  Inadmissible = 'Inadmissible',
  /** Admitted but one or more admission checks are still pending/retrying. */
  AdmissionCheck = 'AdmissionCheck',
  /** Admitted but blocked waiting for preemption gates to clear. */
  BlockedOnPreemptionGates = 'BlockedOnPreemptionGates',
  Running = 'Running',
  Admitted = 'Admitted',
  Complete = 'Complete',
}

export type KueueWorkloadStatusWithMessage = {
  status: KueueWorkloadStatus;
  message?: string;
  timestamp?: string;
  queueName?: string;
  workloadName?: string;
  queuePosition?: number;
  /** Pending workloads in the local queue (Visibility API items.length). */
  queueTotal?: number;
  requeueInfo?: {
    count: number;
    requeueAt?: string;
  };
  /**
   * Multi-Pod admission breakdown (model deployments only — one Workload CR per replica Pod).
   * Present only when there's more than one correlated Workload CR for the model, so the UI can
   * show e.g. "3 of 5 pods admitted" instead of a single pass/fail status.
   */
  podAdmissionCounts?: {
    admitted: number;
    total: number;
  };
};

export type KueueStatusInfo = {
  label: string;
  status?: LabelProps['status'];
  color?: LabelProps['color'];
  IconComponent: ComponentType<SVGProps<SVGSVGElement>>;
  iconClassName?: string;
};

/**
 * Kueue statuses for which we show Kueue in the UI (label, subtitle, modal).
 * For Admitted/Running we use workbench state (Starting, Running) instead.
 */
export const KUEUE_STATUSES_OVERRIDE_WORKBENCH: KueueWorkloadStatus[] = [
  KueueWorkloadStatus.Queued,
  KueueWorkloadStatus.Inadmissible,
  KueueWorkloadStatus.Failed,
  KueueWorkloadStatus.Preempted,
  KueueWorkloadStatus.Evicted,
  KueueWorkloadStatus.Requeued,
  KueueWorkloadStatus.Complete,
];

/**
 * Kueue considers a Workload admitted only once QuotaReserved AND all AdmissionChecks are
 * ready — AdmissionCheck therefore represents a still-pending, potentially-blocking state and
 * must NOT be treated as past admission (see kueue.sigs.k8s.io AdmissionCheck docs). A pending
 * or retrying check can still prevent the Pod from being created.
 */
export const KUEUE_STATUSES_PAST_ADMISSION: KueueWorkloadStatus[] = [
  KueueWorkloadStatus.Admitted,
  KueueWorkloadStatus.Running,
  KueueWorkloadStatus.Complete,
];

/**
 * Kueue statuses that override the normal KServe deployment status in the Status column.
 * For Admitted/Running we show the standard KServe lifecycle state instead.
 * Differs from KUEUE_STATUSES_OVERRIDE_WORKBENCH: includes AdmissionCheck and
 * BlockedOnPreemptionGates (relevant for model deployments), excludes Complete.
 */
export const KUEUE_STATUSES_OVERRIDE_MODEL_DEPLOYMENT: KueueWorkloadStatus[] = [
  KueueWorkloadStatus.Queued,
  KueueWorkloadStatus.Inadmissible,
  KueueWorkloadStatus.Failed,
  KueueWorkloadStatus.Preempted,
  KueueWorkloadStatus.Evicted,
  KueueWorkloadStatus.Requeued,
  KueueWorkloadStatus.AdmissionCheck,
  KueueWorkloadStatus.BlockedOnPreemptionGates,
];
