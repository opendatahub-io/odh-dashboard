import {
  mapWorkloadStatusToOverview,
  OverviewBuckets,
  resolveTrainJobOverview,
  summarizeOverview,
  type WorkloadOverviewRow,
} from '../workloadOverview';

describe('mapWorkloadStatusToOverview', () => {
  it.each([
    ['Succeeded', OverviewBuckets.Completed, 'complete'],
    ['Running', OverviewBuckets.Active, 'running'],
    ['Admitted', OverviewBuckets.Active, 'admitted'],
    ['Ready', OverviewBuckets.Active, 'ready'],
    ['Pending', OverviewBuckets.Waiting, 'pending'],
    ['Queued', OverviewBuckets.Waiting, 'queued'],
    ['Inadmissible', OverviewBuckets.Blockers, 'inadmissible'],
    ['Failed', OverviewBuckets.Failed, 'failed'],
  ])('should map %s to %s', (status, bucket, detail) => {
    expect(mapWorkloadStatusToOverview(status)).toEqual({
      bucket,
      detail,
      statusFilters: [status],
    });
  });

  it('should not classify unknown statuses', () => {
    expect(mapWorkloadStatusToOverview('Unknown')).toBeUndefined();
  });
});

describe('resolveTrainJobOverview', () => {
  it.each([
    [
      { bucket: OverviewBuckets.Blockers, detail: 'paused', statusFilters: ['Paused'] },
      { bucket: OverviewBuckets.Blockers, detail: 'evicted', statusFilters: ['Evicted'] },
      'Paused',
    ],
    [
      { bucket: OverviewBuckets.Active, detail: 'running', statusFilters: ['Running'] },
      { bucket: OverviewBuckets.Blockers, detail: 'evicted', statusFilters: ['Evicted'] },
      'Evicted',
    ],
    [
      { bucket: OverviewBuckets.Active, detail: 'running', statusFilters: ['Running'] },
      { bucket: OverviewBuckets.Active, detail: 'admitted', statusFilters: ['Admitted'] },
      'Running',
    ],
  ])('resolves combined statuses to %s', (workloadOverview, kueueOverview, expected) => {
    expect(
      resolveTrainJobOverview(workloadOverview as never, kueueOverview as never)?.statusFilters[0],
    ).toBe(expected);
  });
});

describe('summarizeOverview', () => {
  it('should count workloads and group status details', () => {
    const rows: WorkloadOverviewRow[] = [
      { bucket: 'active', detail: 'running', statusFilters: ['Running'] },
      { bucket: 'active', detail: 'running', statusFilters: ['Running'] },
      { bucket: 'waiting', detail: 'queued', statusFilters: ['Queued'] },
    ];

    expect(summarizeOverview(rows)).toEqual({
      total: 3,
      counts: { completed: 0, active: 2, waiting: 1, blockers: 0, failed: 0 },
      details: {
        completed: {},
        active: { running: 2 },
        waiting: { queued: 1 },
        blockers: {},
        failed: {},
      },
    });
  });

  it('should return zero counts for empty data', () => {
    expect(summarizeOverview([]).total).toBe(0);
  });
});
