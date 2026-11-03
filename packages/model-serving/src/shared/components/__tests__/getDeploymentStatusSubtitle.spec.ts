import { KueueWorkloadStatus } from '@odh-dashboard/k8s-core/kueue/types';
import { ModelDeploymentState } from '@odh-dashboard/model-serving/shared';
import {
  getDeploymentStatusSubtitle,
  getDeploymentStatusSubtitleBoldText,
} from '../getDeploymentStatusSubtitle';

describe('getDeploymentStatusSubtitle', () => {
  it('shows only queue position for Queued status when queuePosition is set', () => {
    const subtitle = getDeploymentStatusSubtitle({
      state: ModelDeploymentState.PENDING,
      kueueStatus: {
        status: KueueWorkloadStatus.Queued,
        queueName: 'constrained-queue',
        queuePosition: 2,
      },
    });
    expect(subtitle).toBe('2nd in constrained-queue');
    expect(subtitle).not.toContain('Waiting for quota');
  });

  it('does not show subtitle for Admitted status', () => {
    const subtitle = getDeploymentStatusSubtitle({
      state: ModelDeploymentState.LOADED,
      kueueStatus: {
        status: KueueWorkloadStatus.Admitted,
        queueName: 'my-queue',
        queuePosition: 3,
      },
    });
    expect(subtitle).toBeNull();
  });

  it('shows Kueue message without position when queuePosition is absent', () => {
    const subtitle = getDeploymentStatusSubtitle({
      state: ModelDeploymentState.PENDING,
      kueueStatus: {
        status: KueueWorkloadStatus.Queued,
        queueName: 'my-queue',
      },
    });
    expect(subtitle).toBe('Waiting for quota in my-queue');
  });

  it('shows only queue position when pod admission counts are also present', () => {
    const subtitle = getDeploymentStatusSubtitle({
      state: ModelDeploymentState.PENDING,
      kueueStatus: {
        status: KueueWorkloadStatus.Queued,
        queueName: 'my-queue',
        queuePosition: 2,
        podAdmissionCounts: { admitted: 3, total: 5 },
      },
    });
    expect(subtitle).toBe('2nd in my-queue');
  });
});

describe('getDeploymentStatusSubtitleBoldText', () => {
  it('returns the queue name when the subtitle is a Kueue message', () => {
    expect(
      getDeploymentStatusSubtitleBoldText({
        state: ModelDeploymentState.PENDING,
        kueueStatus: { status: KueueWorkloadStatus.Queued, queueName: 'my-queue' },
      }),
    ).toBe('my-queue');
  });

  it('returns undefined when the subtitle is the deployment failure message', () => {
    expect(
      getDeploymentStatusSubtitleBoldText({
        state: ModelDeploymentState.FAILED_TO_LOAD,
        message: 'Failed to pull image',
        kueueStatus: { status: KueueWorkloadStatus.Admitted, queueName: 'my-queue' },
      }),
    ).toBeUndefined();
  });
});
