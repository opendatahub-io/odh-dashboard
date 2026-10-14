import {
  mapWorkloadStatusToOverview,
  summarizeOverview,
  type WorkloadOverviewRow,
} from '../workloadOverview';

describe('mapWorkloadStatusToOverview', () => {
  it.each([
    ['Succeeded', 'completed', 'complete'],
    ['Running', 'active', 'running'],
    ['Admitted', 'active', 'admitted'],
    ['Ready', 'active', 'ready'],
    ['Pending', 'waiting', 'pending'],
    ['Queued', 'waiting', 'queued'],
    ['Inadmissible', 'blockers', 'inadmissible'],
    ['Failed', 'failed', 'failed'],
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
