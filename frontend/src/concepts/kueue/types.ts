export enum KueueWorkloadStatus {
  Queued = 'Queued',
  Failed = 'Failed',
  Preempted = 'Preempted',
  Inadmissible = 'Inadmissible',
  Running = 'Running',
  Admitted = 'Admitted',
  Succeeded = 'Succeeded',
}

export type KueueWorkloadStatusWithMessage = {
  status: KueueWorkloadStatus;
  message?: string;
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
  KueueWorkloadStatus.Succeeded,
];
