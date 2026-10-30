import { KueueWorkloadStatus } from '@odh-dashboard/k8s-core/kueue/types';
import { TrainingJobState } from '@odh-dashboard/model-training/types';
import { ModelDeploymentState } from '@odh-dashboard/model-serving/shared';

export const OverviewBuckets = {
  Completed: 'completed',
  Active: 'active',
  Waiting: 'waiting',
  Blockers: 'blockers',
  Failed: 'failed',
} as const;
export type OverviewBucket = (typeof OverviewBuckets)[keyof typeof OverviewBuckets];
export const overviewBuckets = Object.values(OverviewBuckets);

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

export const resolveTrainJobOverview = (
  workloadOverview: WorkloadOverviewRow | undefined,
  kueueOverview: WorkloadOverviewRow | undefined,
): WorkloadOverviewRow | undefined => {
  if (workloadOverview?.statusFilters.includes(TrainingJobState.PAUSED)) {
    return workloadOverview;
  }
  if (
    kueueOverview?.bucket === OverviewBuckets.Waiting ||
    kueueOverview?.bucket === OverviewBuckets.Blockers
  ) {
    return kueueOverview;
  }
  return workloadOverview ?? kueueOverview;
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

/** Calculates whole-number percentages that sum to 100 for non-empty overview data. */
export const calculateWorkloadOverviewPercentages = (
  counts: Record<OverviewBucket, number>,
  total: number,
): Record<OverviewBucket, number> => {
  const workloadOverviewPercentages: Record<OverviewBucket, number> = {
    completed: 0,
    active: 0,
    waiting: 0,
    blockers: 0,
    failed: 0,
  };

  if (total <= 0) {
    return workloadOverviewPercentages;
  }

  const bucketPercentageCalculations = overviewBuckets.map((bucket, index) => {
    const exactPercentage = (counts[bucket] / total) * 100;
    const wholePercentage = Math.floor(exactPercentage);

    return {
      bucket,
      index,
      wholePercentage,
      remainder: exactPercentage - wholePercentage,
    };
  });
  const remainingPercentagePoints =
    100 -
    bucketPercentageCalculations.reduce((sum, calculation) => sum + calculation.wholePercentage, 0);

  bucketPercentageCalculations
    .toSorted((a, b) => b.remainder - a.remainder || a.index - b.index)
    .forEach(({ bucket, wholePercentage }, index) => {
      workloadOverviewPercentages[bucket] =
        wholePercentage + (index < remainingPercentagePoints ? 1 : 0);
    });

  return workloadOverviewPercentages;
};
