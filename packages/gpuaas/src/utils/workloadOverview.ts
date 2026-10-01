/** Status contract for the table ticket: derive overview from the complete, unpaginated row set. */
export const overviewBuckets = ['completed', 'active', 'waiting', 'blockers', 'failed'] as const;
export type OverviewBucket = (typeof overviewBuckets)[number];

export type WorkloadOverviewRow = {
  bucket: OverviewBucket;
  detail: string;
};

/** Status is the displayed workload status, independent of the resource kind. */
export type WorkloadOverviewStatusInput = {
  status: string;
};

const statusBuckets: Partial<Record<OverviewBucket, readonly string[]>> = {
  completed: ['Succeeded', 'Complete'],
  active: ['Running', 'Ready', 'Loaded', 'Restarting', 'Deleting', 'Stopping'],
  waiting: [
    'Created',
    'Pending',
    'Queued',
    'Requeued',
    'Starting',
    'Loading',
    'Standby',
    'Initializing',
    'Retrying',
    'Suspending',
    'Waiting',
    'AdmissionCheck',
  ],
  blockers: [
    'Paused',
    'Suspended',
    'Preempted',
    'Inadmissible',
    'Evicted',
    'BlockedOnPreemptionGates',
    'Stopped',
  ],
  failed: ['Failed', 'FailedToLoad', 'ValidationFailed'],
};

const bucketFor = (status: string): OverviewBucket | undefined =>
  overviewBuckets.find((bucket) => statusBuckets[bucket]?.includes(status));

const detailFor = (status: string): string => {
  switch (status) {
    case 'Succeeded':
    case 'Complete':
      return 'complete';
    case 'Loaded':
      return 'ready';
    case 'FailedToLoad':
      return 'failed to load';
    case 'ValidationFailed':
      return 'validation failed';
    case 'Loading':
    case 'Standby':
      return 'starting';
    case 'BlockedOnPreemptionGates':
      return 'blocked on preemption';
    default:
      return status.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  }
};

/** One top-level resource contributes one row; the same status maps identically for every kind. */
export const mapWorkloadStatusToOverview = ({
  status,
}: WorkloadOverviewStatusInput): WorkloadOverviewRow | undefined => {
  const bucket = bucketFor(status);
  if (!bucket) return undefined;

  return {
    bucket,
    detail: detailFor(status),
  };
};

export type OverviewSummary = {
  counts: Record<OverviewBucket, number>;
  details: Record<OverviewBucket, Record<string, number>>;
  total: number;
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
