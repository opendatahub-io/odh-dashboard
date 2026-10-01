import {
  mapWorkloadStatusToOverview,
  summarizeOverview,
  type WorkloadOverviewRow,
} from '../workloadOverview';

describe('mapWorkloadStatusToOverview', () => {
  it.each<{
    status: string;
    bucket: WorkloadOverviewRow['bucket'];
    detail: string;
  }>([
    { status: 'Succeeded', bucket: 'completed', detail: 'complete' },
    { status: 'Complete', bucket: 'completed', detail: 'complete' },
    { status: 'Running', bucket: 'active', detail: 'running' },
    { status: 'Ready', bucket: 'active', detail: 'ready' },
    { status: 'Loaded', bucket: 'active', detail: 'ready' },
    { status: 'Restarting', bucket: 'active', detail: 'restarting' },
    { status: 'Created', bucket: 'waiting', detail: 'created' },
    { status: 'Pending', bucket: 'waiting', detail: 'pending' },
    { status: 'Queued', bucket: 'waiting', detail: 'queued' },
    { status: 'Requeued', bucket: 'waiting', detail: 'requeued' },
    { status: 'Starting', bucket: 'waiting', detail: 'starting' },
    { status: 'Loading', bucket: 'waiting', detail: 'starting' },
    { status: 'Standby', bucket: 'waiting', detail: 'starting' },
    { status: 'AdmissionCheck', bucket: 'waiting', detail: 'admission check' },
    { status: 'Paused', bucket: 'blockers', detail: 'paused' },
    { status: 'Suspended', bucket: 'blockers', detail: 'suspended' },
    { status: 'Preempted', bucket: 'blockers', detail: 'preempted' },
    { status: 'Inadmissible', bucket: 'blockers', detail: 'inadmissible' },
    { status: 'Evicted', bucket: 'blockers', detail: 'evicted' },
    { status: 'Stopped', bucket: 'blockers', detail: 'stopped' },
    { status: 'Failed', bucket: 'failed', detail: 'failed' },
    {
      status: 'FailedToLoad',
      bucket: 'failed',
      detail: 'failed to load',
    },
    { status: 'ValidationFailed', bucket: 'failed', detail: 'validation failed' },
  ])('should map $status to $bucket', ({ status, bucket, detail }) => {
    expect(mapWorkloadStatusToOverview({ status })).toEqual({
      bucket,
      detail,
    });
  });

  it('should not silently classify unknown resource statuses as waiting', () => {
    expect(mapWorkloadStatusToOverview({ status: 'Unknown' })).toBeUndefined();
  });

  it('should map workload status without requiring Kueue admission data', () => {
    expect(mapWorkloadStatusToOverview({ status: 'Pending' })).toEqual({
      bucket: 'waiting',
      detail: 'pending',
    });
  });
});

describe('summarizeOverview', () => {
  it('should count one row per workload and group its status details', () => {
    const rows: WorkloadOverviewRow[] = [
      { bucket: 'active', detail: 'running' },
      { bucket: 'active', detail: 'running' },
      { bucket: 'waiting', detail: 'queued' },
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

  it('should report zero for empty data', () => {
    expect(summarizeOverview([])).toEqual({
      total: 0,
      counts: { completed: 0, active: 0, waiting: 0, blockers: 0, failed: 0 },
      details: { completed: {}, active: {}, waiting: {}, blockers: {}, failed: {} },
    });
  });
});
