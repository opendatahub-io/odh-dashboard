import { KueueWorkloadStatus } from '@odh-dashboard/k8s-core/kueue/types';
import { t_global_text_color_regular as RegularColor } from '@patternfly/react-tokens';
import { ModelDeploymentState } from '@odh-dashboard/model-serving/shared';
import {
  getDeploymentStatusSubtitle,
  getDeploymentStatusSubtitleColor,
} from '../getDeploymentStatusSubtitle';

describe('getDeploymentStatusSubtitle', () => {
  it('should show deletion progress ahead of a stale Kueue failure', () => {
    const status = {
      state: ModelDeploymentState.DELETING,
      message: 'Waiting for serving controllers to finish deleting.',
      kueueStatus: { status: KueueWorkloadStatus.Failed, queueName: 'my-queue' },
    };
    expect(getDeploymentStatusSubtitle(status)).toBe(status.message);
    expect(getDeploymentStatusSubtitleColor(status)).toBe(RegularColor.var);
  });
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

  it('appends pod admission counts after queue position when both are present', () => {
    const subtitle = getDeploymentStatusSubtitle({
      state: ModelDeploymentState.PENDING,
      kueueStatus: {
        status: KueueWorkloadStatus.Queued,
        queueName: 'my-queue',
        queuePosition: 2,
        podAdmissionCounts: { admitted: 3, total: 5 },
      },
    });
    expect(subtitle).toBe('2nd in my-queue (3 of 5 pods admitted)');
  });
});
