import { KueueWorkloadStatus } from '#~/concepts/kueue/types';
import { getWorkbenchKueueTrackingProperties } from '#~/concepts/kueue/workbenchTracking';

describe('getWorkbenchKueueTrackingProperties', () => {
  it('omits queue fields when status and queue name are absent', () => {
    expect(getWorkbenchKueueTrackingProperties({ kueueStatus: null })).toEqual({
      primaryWorkbenchStatus: 'Stopped',
      isKueueBlocking: false,
      kueueSubState: 'none',
    });
  });

  it('includes queue position/total and overrides primary status when Kueue is blocking', () => {
    expect(
      getWorkbenchKueueTrackingProperties({
        kueueStatus: {
          status: KueueWorkloadStatus.Queued,
          queueName: 'team-queue',
          queuePosition: 2,
          queueTotal: 5,
          message: 'waiting for pods',
        },
        isStarting: true,
      }),
    ).toEqual({
      kueueQueueName: 'team-queue',
      queuePosition: 2,
      queueTotal: 5,
      primaryWorkbenchStatus: 'Queued',
      isKueueBlocking: true,
      kueueSubState: 'waiting_for_resources',
    });
  });

  it('uses explicit kueueQueueName and workbench flags when status is not blocking', () => {
    expect(
      getWorkbenchKueueTrackingProperties({
        kueueStatus: {
          status: KueueWorkloadStatus.Admitted,
          queueName: 'from-status',
        },
        kueueQueueName: 'from-form',
        isRunning: true,
      }),
    ).toEqual({
      kueueQueueName: 'from-form',
      primaryWorkbenchStatus: 'Ready',
      isKueueBlocking: false,
      kueueSubState: 'admitted',
    });
  });

  it('prefers Stopping over other workbench flags', () => {
    expect(
      getWorkbenchKueueTrackingProperties({
        kueueStatus: null,
        isStarting: true,
        isRunning: true,
        isStopping: true,
      }).primaryWorkbenchStatus,
    ).toBe('Stopping');
  });
});
