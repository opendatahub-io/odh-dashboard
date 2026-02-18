import type { WorkloadCondition, WorkloadKind } from '#~/k8sTypes';
import { getKueueWorkloadStatusWithMessage, getKueueStatusInfo } from '#~/concepts/kueue';
import { KueueWorkloadStatus } from '#~/concepts/kueue/types';

const baseWorkload: WorkloadKind = {
  apiVersion: 'kueue.x-k8s.io/v1beta1',
  kind: 'Workload',
  metadata: { name: 'test-workload', namespace: 'test-ns' },
  spec: {
    active: true,
    podSets: [{ count: 1, name: 'main', template: { metadata: {}, spec: { containers: [] } } }],
    queueName: 'test-queue',
  },
};

function workloadWithConditions(conditions: WorkloadCondition[]): WorkloadKind {
  return {
    ...baseWorkload,
    status: { conditions },
  };
}

describe('getKueueWorkloadStatusWithMessage', () => {
  it('should return Failed when Finished with failure reason', () => {
    const workload = workloadWithConditions([
      {
        type: 'Finished',
        status: 'True',
        reason: 'Failed',
        message: 'Job has reached the specified backoff limit',
        lastTransitionTime: '2026-02-16T08:00:00Z',
      },
    ]);
    const result = getKueueWorkloadStatusWithMessage(workload);
    expect(result.status).toBe(KueueWorkloadStatus.Failed);
    expect(result.message).toContain('backoff');
  });

  it('should return Failed when Finished with error in message', () => {
    const workload = workloadWithConditions([
      {
        type: 'Finished',
        status: 'True',
        reason: 'Error',
        message: 'Container exited with error',
        lastTransitionTime: '2026-02-16T08:00:00Z',
      },
    ]);
    const result = getKueueWorkloadStatusWithMessage(workload);
    expect(result.status).toBe(KueueWorkloadStatus.Failed);
  });

  it('should return Inadmissible when QuotaReserved=False and reason Inadmissible', () => {
    const workload = workloadWithConditions([
      {
        type: 'QuotaReserved',
        status: 'False',
        reason: 'Inadmissible',
        message: 'Namespace does not match cluster queue selector',
        lastTransitionTime: '2026-02-16T08:00:00Z',
      },
    ]);
    const result = getKueueWorkloadStatusWithMessage(workload);
    expect(result.status).toBe(KueueWorkloadStatus.Inadmissible);
    expect(result.message).toBeDefined();
  });

  it('should return Preempted when Evicted condition is True', () => {
    const workload = workloadWithConditions([
      {
        type: 'Evicted',
        status: 'True',
        reason: 'Preempted',
        message: 'Preempted by higher priority workload',
        lastTransitionTime: '2026-02-16T08:00:00Z',
      },
    ]);
    const result = getKueueWorkloadStatusWithMessage(workload);
    expect(result.status).toBe(KueueWorkloadStatus.Preempted);
    expect(result.message).toContain('Preempted');
  });

  it('should return Preempted when Preempted condition is True', () => {
    const workload = workloadWithConditions([
      {
        type: 'Preempted',
        status: 'True',
        reason: 'PreemptedByHigherPriority',
        message: 'Workload was preempted',
        lastTransitionTime: '2026-02-16T08:00:00Z',
      },
    ]);
    const result = getKueueWorkloadStatusWithMessage(workload);
    expect(result.status).toBe(KueueWorkloadStatus.Preempted);
  });

  it('should return Succeeded when Finished with success reason', () => {
    const workload = workloadWithConditions([
      {
        type: 'Finished',
        status: 'True',
        reason: 'Succeeded',
        message: 'Job completed successfully',
        lastTransitionTime: '2026-02-16T08:00:00Z',
      },
    ]);
    const result = getKueueWorkloadStatusWithMessage(workload);
    expect(result.status).toBe(KueueWorkloadStatus.Succeeded);
  });

  it('should return Succeeded when Finished with reason that matches neither failure nor success (fallback)', () => {
    const workload = workloadWithConditions([
      {
        type: 'Finished',
        status: 'True',
        reason: 'Completed',
        message: 'Work completed',
        lastTransitionTime: '2026-02-16T08:00:00Z',
      },
    ]);
    const result = getKueueWorkloadStatusWithMessage(workload);
    expect(result.status).toBe(KueueWorkloadStatus.Succeeded);
  });

  it('should return Succeeded when Finished with JobFinished reason (fallback)', () => {
    const workload = workloadWithConditions([
      {
        type: 'Finished',
        status: 'True',
        reason: 'JobFinished',
        message: 'Job finished',
        lastTransitionTime: '2026-02-16T08:00:00Z',
      },
    ]);
    const result = getKueueWorkloadStatusWithMessage(workload);
    expect(result.status).toBe(KueueWorkloadStatus.Succeeded);
  });

  it('should return Failed when Finished with timeout in message', () => {
    const workload = workloadWithConditions([
      {
        type: 'Finished',
        status: 'True',
        reason: 'Timeout',
        message: 'Job timed out after 5 minutes',
        lastTransitionTime: '2026-02-16T08:00:00Z',
      },
    ]);
    const result = getKueueWorkloadStatusWithMessage(workload);
    expect(result.status).toBe(KueueWorkloadStatus.Failed);
  });

  it('should return Failed when Finished with rejected in reason', () => {
    const workload = workloadWithConditions([
      {
        type: 'Finished',
        status: 'True',
        reason: 'Rejected',
        message: 'Request was rejected',
        lastTransitionTime: '2026-02-16T08:00:00Z',
      },
    ]);
    const result = getKueueWorkloadStatusWithMessage(workload);
    expect(result.status).toBe(KueueWorkloadStatus.Failed);
  });

  it('should prefer explicit success over fallback when both exist', () => {
    const workload = workloadWithConditions([
      {
        type: 'Finished',
        status: 'True',
        reason: 'Completed',
        message: 'Done',
        lastTransitionTime: '2026-02-16T08:00:00Z',
      },
      {
        type: 'Finished',
        status: 'True',
        reason: 'Succeeded',
        message: 'Job completed successfully',
        lastTransitionTime: '2026-02-16T08:00:01Z',
      },
    ]);
    const result = getKueueWorkloadStatusWithMessage(workload);
    expect(result.status).toBe(KueueWorkloadStatus.Succeeded);
    expect(result.message).toContain('successfully');
  });

  it('should use first Finished condition for Failed when multiple match failure', () => {
    const workload = workloadWithConditions([
      {
        type: 'Finished',
        status: 'True',
        reason: 'Failed',
        message: 'First failure',
        lastTransitionTime: '2026-02-16T08:00:00Z',
      },
      {
        type: 'Finished',
        status: 'True',
        reason: 'Error',
        message: 'Second failure',
        lastTransitionTime: '2026-02-16T08:00:01Z',
      },
    ]);
    const result = getKueueWorkloadStatusWithMessage(workload);
    expect(result.status).toBe(KueueWorkloadStatus.Failed);
    expect(result.message).toBe('First failure');
  });

  it('should return Running when PodsReady is True', () => {
    const workload = workloadWithConditions([
      {
        type: 'PodsReady',
        status: 'True',
        reason: 'PodsReady',
        message: 'All pods are ready',
        lastTransitionTime: '2026-02-16T08:00:00Z',
      },
    ]);
    const result = getKueueWorkloadStatusWithMessage(workload);
    expect(result.status).toBe(KueueWorkloadStatus.Running);
  });

  it('should return Admitted when Admitted condition is True', () => {
    const workload = workloadWithConditions([
      {
        type: 'Admitted',
        status: 'True',
        reason: 'Admitted',
        message: 'The workload is admitted',
        lastTransitionTime: '2026-02-16T08:00:00Z',
      },
    ]);
    const result = getKueueWorkloadStatusWithMessage(workload);
    expect(result.status).toBe(KueueWorkloadStatus.Admitted);
  });

  it('should return Queued when QuotaReserved is False (Pending)', () => {
    const workload = workloadWithConditions([
      {
        type: 'QuotaReserved',
        status: 'False',
        reason: 'Pending',
        message:
          "couldn't assign flavors to pod set: insufficient unused quota for cpu in flavor workbench-preempted-test-flavor",
        lastTransitionTime: '2026-02-16T08:00:00Z',
      },
    ]);
    const result = getKueueWorkloadStatusWithMessage(workload);
    expect(result.status).toBe(KueueWorkloadStatus.Queued);
    expect(result.message).toContain('insufficient unused quota');
  });

  it('should respect priority order: Failed before Admitted', () => {
    const workload = workloadWithConditions([
      {
        type: 'Admitted',
        status: 'True',
        reason: 'Admitted',
        message: 'Admitted',
        lastTransitionTime: '2026-02-16T08:00:00Z',
      },
      {
        type: 'Finished',
        status: 'True',
        reason: 'Failed',
        message: 'Job failed',
        lastTransitionTime: '2026-02-16T08:00:00Z',
      },
    ]);
    const result = getKueueWorkloadStatusWithMessage(workload);
    expect(result.status).toBe(KueueWorkloadStatus.Failed);
  });

  it('should respect priority order: Preempted before Queued', () => {
    const workload = workloadWithConditions([
      {
        type: 'QuotaReserved',
        status: 'False',
        reason: 'Pending',
        message: 'Pending',
        lastTransitionTime: '2026-02-16T08:00:00Z',
      },
      {
        type: 'Evicted',
        status: 'True',
        reason: 'Preempted',
        message: 'Preempted',
        lastTransitionTime: '2026-02-16T08:00:00Z',
      },
    ]);
    const result = getKueueWorkloadStatusWithMessage(workload);
    expect(result.status).toBe(KueueWorkloadStatus.Preempted);
  });

  it('should return Queued when workload has no conditions', () => {
    const workload = { ...baseWorkload, status: { conditions: [] } };
    const result = getKueueWorkloadStatusWithMessage(workload);
    expect(result.status).toBe(KueueWorkloadStatus.Queued);
    expect(result.message).toBeUndefined();
  });

  it('should return Queued when workload has no status', () => {
    const workload = { ...baseWorkload, status: undefined };
    const result = getKueueWorkloadStatusWithMessage(workload);
    expect(result.status).toBe(KueueWorkloadStatus.Queued);
  });

  it('should use message when present, else reason', () => {
    const workload = workloadWithConditions([
      {
        type: 'Evicted',
        status: 'True',
        reason: 'Preempted',
        message: 'Custom message',
        lastTransitionTime: '2026-02-16T08:00:00Z',
      },
    ]);
    const result = getKueueWorkloadStatusWithMessage(workload);
    expect(result.message).toBe('Custom message');
  });
});

describe('getKueueStatusInfo', () => {
  it('should return correct info for Queued', () => {
    const info = getKueueStatusInfo(KueueWorkloadStatus.Queued);
    expect(info.label).toBe('Queued');
    expect(info.color).toBe('grey');
    expect(info.IconComponent).toBeDefined();
  });

  it('should return correct info for Failed', () => {
    const info = getKueueStatusInfo(KueueWorkloadStatus.Failed);
    expect(info.label).toBe('Failed');
    expect(info.status).toBe('danger');
    expect(info.color).toBe('red');
  });

  it('should return correct info for Preempted', () => {
    const info = getKueueStatusInfo(KueueWorkloadStatus.Preempted);
    expect(info.label).toBe('Preempted');
    expect(info.status).toBe('warning');
    expect(info.color).toBe('orange');
  });

  it('should return correct info for Inadmissible', () => {
    const info = getKueueStatusInfo(KueueWorkloadStatus.Inadmissible);
    expect(info.label).toBe('Inadmissible');
    expect(info.status).toBe('warning');
    expect(info.color).toBe('orange');
  });

  it('should return correct info for Running', () => {
    const info = getKueueStatusInfo(KueueWorkloadStatus.Running);
    expect(info.label).toBe('Running');
    expect(info.color).toBe('blue');
  });

  it('should return correct info for Admitted', () => {
    const info = getKueueStatusInfo(KueueWorkloadStatus.Admitted);
    expect(info.label).toBe('Starting');
    expect(info.color).toBe('blue');
    expect(info.iconClassName).toBe('odh-u-spin');
  });

  it('should return correct info for Succeeded', () => {
    const info = getKueueStatusInfo(KueueWorkloadStatus.Succeeded);
    expect(info.label).toBe('Complete');
    expect(info.status).toBe('success');
    expect(info.color).toBe('green');
  });

  it('should return default for unknown status', () => {
    const info = getKueueStatusInfo('Unknown' as KueueWorkloadStatus);
    expect(info.label).toBe('Unknown');
    expect(info.color).toBe('grey');
  });
});
