import { hasActiveKueueWorkloadStatus } from '~/app/hooks/useKueueWorkloadStatuses';
import type { KueueWorkloadState, KueueWorkloadStatus } from '~/app/types';

const makeStatus = (state: KueueWorkloadState): KueueWorkloadStatus => ({
  // eslint-disable-next-line camelcase -- API payload uses OpenAPI field names.
  evaluation_id: 'evaluation-1',
  // eslint-disable-next-line camelcase -- API payload uses OpenAPI field names.
  queue_name: 'default',
  state,
});

describe('hasActiveKueueWorkloadStatus', () => {
  it('keeps polling while Kueue is still queueing or running a Workload', () => {
    expect(hasActiveKueueWorkloadStatus([makeStatus('queued')])).toBe(true);
    expect(hasActiveKueueWorkloadStatus([makeStatus('admitted')])).toBe(true);
  });

  it('stops polling once Kueue reaches a terminal Workload state', () => {
    expect(hasActiveKueueWorkloadStatus([makeStatus('finished')])).toBe(false);
    expect(hasActiveKueueWorkloadStatus([makeStatus('preempted')])).toBe(false);
    expect(hasActiveKueueWorkloadStatus([])).toBe(false);
  });
});
