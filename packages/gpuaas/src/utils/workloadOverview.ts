import { KueueWorkloadStatus } from '@odh-dashboard/k8s-core/kueue/types';
import { ModelDeploymentState } from '@odh-dashboard/model-serving/shared';

export const overviewBuckets = ['completed', 'active', 'waiting', 'blockers', 'failed'] as const;
export type OverviewBucket = (typeof overviewBuckets)[number];

export type WorkloadOverviewRow = {
  bucket: OverviewBucket;
  detail: string;
  statusFilters: string[];
};
export type OverviewSummary = {
  counts: Record<OverviewBucket, number>;
  details: Record<OverviewBucket, Record<string, number>>;
  total: number;
};

const statusBuckets: Record<OverviewBucket, readonly string[]> = {
  completed: ['Succeeded', KueueWorkloadStatus.Complete],
  active: [
    KueueWorkloadStatus.Running,
    'Ready',
    'Loaded',
    'Restarting',
    'Deleting',
    'Stopping',
    KueueWorkloadStatus.Admitted,
  ],
  waiting: [
    'Created',
    'Pending',
    KueueWorkloadStatus.Queued,
    KueueWorkloadStatus.Requeued,
    'Starting',
    'Loading',
    'Standby',
    'Initializing',
    'Retrying',
    'Suspending',
    'Waiting',
    KueueWorkloadStatus.AdmissionCheck,
  ],
  blockers: [
    'Paused',
    'Suspended',
    KueueWorkloadStatus.Preempted,
    KueueWorkloadStatus.Inadmissible,
    KueueWorkloadStatus.Evicted,
    KueueWorkloadStatus.BlockedOnPreemptionGates,
    'Stopped',
  ],
  failed: [KueueWorkloadStatus.Failed, ModelDeploymentState.FAILED_TO_LOAD],
};

const getOverviewBucketForStatus = (status: string): OverviewBucket | undefined =>
  overviewBuckets.find((bucket) => statusBuckets[bucket].includes(status));

const getWorkloadStatusDetail = (status: string): string => {
  switch (status) {
    case 'Succeeded':
    case KueueWorkloadStatus.Complete:
      return 'complete';
    case 'Loaded':
      return 'ready';
    case ModelDeploymentState.FAILED_TO_LOAD:
      return 'failed to load';
    case 'Loading':
    case 'Standby':
      return 'starting';
    case 'BlockedOnPreemptionGates':
      return 'blocked on preemption';
    default:
      return status.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  }
};

export const mapWorkloadStatusToOverview = (status: string): WorkloadOverviewRow | undefined => {
  const bucket = getOverviewBucketForStatus(status);
  return bucket
    ? { bucket, detail: getWorkloadStatusDetail(status), statusFilters: [status] }
    : undefined;
};

export const summarizeOverview = (rows: WorkloadOverviewRow[]): OverviewSummary => {
  const counts: Record<OverviewBucket, number> = {
    completed: 0,
    active: 0,
    waiting: 0,
    blockers: 0,
    failed: 0,
  };
  const details: Record<OverviewBucket, Record<string, number>> = {
    completed: {},
    active: {},
    waiting: {},
    blockers: {},
    failed: {},
  };

  rows.forEach(({ bucket, detail }) => {
    counts[bucket] += 1;
    details[bucket][detail] = (details[bucket][detail] ?? 0) + 1;
  });

  return { counts, details, total: rows.length };
};
