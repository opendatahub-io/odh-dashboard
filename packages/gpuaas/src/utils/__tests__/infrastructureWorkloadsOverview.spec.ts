import { KueueWorkloadStatus } from '@odh-dashboard/k8s-core/kueue/types';
import { getWorkloadOverviewRow } from '../infrastructureWorkloads';

describe('getWorkloadOverviewRow', () => {
  it('should use a Kueue waiting status while filtering only by that status', () => {
    const row = getWorkloadOverviewRow({
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
      kueueStatus: KueueWorkloadStatus.Inadmissible,
      status: { label: 'Ready' },
    } as never);

    expect(row).toEqual({
      bucket: 'blockers',
      detail: 'inadmissible',
      statusFilters: [KueueWorkloadStatus.Inadmissible],
    });
  });
});
