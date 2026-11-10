import { KueueWorkloadStatus } from '@odh-dashboard/k8s-core/kueue/types';
import { TrainingJobState } from '@odh-dashboard/model-training/types';
import { getWorkloadOverviewRow } from '../infrastructureWorkloads';

describe('getWorkloadOverviewRow', () => {
  it('maps a TrainJob with running status to active workloads', () => {
    const row = getWorkloadOverviewRow({
      resource: { kind: 'TrainJob' },
      status: { label: 'Running' },
    } as never);

    expect(row).toEqual({
      bucket: 'active',
      detail: 'running',
      statusFilters: ['Running'],
    });
  });

  it('should use a Kueue waiting status while filtering only by that status', () => {
    const row = getWorkloadOverviewRow({
      resource: { kind: 'TrainJob' },
      kueueStatus: KueueWorkloadStatus.Queued,
      status: { label: 'Ready' },
    } as never);

    expect(row).toEqual({
      bucket: 'waiting',
      detail: 'queued',
      statusFilters: [KueueWorkloadStatus.Queued],
    });
  });

  it('should use the workload status when Kueue has admitted the workload', () => {
    const row = getWorkloadOverviewRow({
      resource: { kind: 'Notebook' },
      kueueStatus: KueueWorkloadStatus.Admitted,
      status: { label: 'Ready' },
    } as never);

    expect(row).toEqual({
      bucket: 'active',
      detail: 'ready',
      statusFilters: ['Ready'],
    });
  });

  it('should use a Kueue blocker status over the workload status', () => {
    const row = getWorkloadOverviewRow({
      resource: { kind: 'Notebook' },
      kueueStatus: KueueWorkloadStatus.Inadmissible,
      status: { label: 'Ready' },
    } as never);

    expect(row).toEqual({
      bucket: 'blockers',
      detail: 'inadmissible',
      statusFilters: [KueueWorkloadStatus.Inadmissible],
    });
  });

  it('should keep paused TrainJob status over Kueue eviction', () => {
    const row = getWorkloadOverviewRow({
      resource: { kind: 'TrainJob' },
      jobStatus: TrainingJobState.PAUSED,
      kueueStatus: KueueWorkloadStatus.Evicted,
      status: { label: 'Paused' },
    } as never);

    expect(row).toEqual({
      bucket: 'blockers',
      detail: 'paused',
      statusFilters: ['Paused'],
    });
  });
});
