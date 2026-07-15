import { KueueWorkloadStatus } from '#~/concepts/kueue/types';
import {
  getHumanReadableKueueMessage,
  getKueueSubStepInfo,
  getPreemptionToastBody,
  getEvictionToastBody,
  getRequeuedMessage,
} from '#~/concepts/kueue/messageUtils';

describe('getHumanReadableKueueMessage', () => {
  describe('Queued status', () => {
    it.each([
      ['insufficient unused quota for cpu', 'Waiting for quota in test-queue'],
      ["couldn't assign flavors to pod set main", 'Waiting for quota in test-queue'],
      [undefined, 'Waiting for quota in test-queue'],
    ])('should return quota waiting message for message %s', (rawMessage, expected) => {
      expect(
        getHumanReadableKueueMessage(KueueWorkloadStatus.Queued, rawMessage, 'test-queue'),
      ).toBe(expected);
    });

    it('should return generic waiting message for non-quota reasons', () => {
      expect(
        getHumanReadableKueueMessage(
          KueueWorkloadStatus.Queued,
          'some other reason for waiting',
          'test-queue',
        ),
      ).toBe('Waiting for available resources');
    });

    it('should use "the queue" when queue name is not provided', () => {
      expect(getHumanReadableKueueMessage(KueueWorkloadStatus.Queued, undefined)).toBe(
        'Waiting for quota in the queue',
      );
    });
  });

  describe('Failed status', () => {
    it.each([
      ['ClusterQueue not found', 'Queue test-queue does not exist'],
      ['queue does not exist', 'Queue test-queue does not exist'],
    ])('should return queue not found message for message "%s"', (rawMessage, expected) => {
      expect(
        getHumanReadableKueueMessage(KueueWorkloadStatus.Failed, rawMessage, 'test-queue'),
      ).toBe(expected);
    });

    it('should return timeout message when raw message mentions timeout', () => {
      expect(
        getHumanReadableKueueMessage(
          KueueWorkloadStatus.Failed,
          'Job timed out after 5 minutes',
          'test-queue',
        ),
      ).toBe('Queue timed out');
    });

    it('should return exceeded quota message when raw message mentions quota', () => {
      expect(
        getHumanReadableKueueMessage(
          KueueWorkloadStatus.Failed,
          'quota exceeded for the cluster queue',
          'test-queue',
        ),
      ).toBe('Exceeded quota for test-queue');
    });

    it('should return raw message as fallback for unrecognized failure reasons', () => {
      expect(
        getHumanReadableKueueMessage(
          KueueWorkloadStatus.Failed,
          'Job has reached the specified backoff limit',
          'test-queue',
        ),
      ).toBe('Job has reached the specified backoff limit');
    });

    it('should return exceeded quota message when no raw message provided', () => {
      expect(
        getHumanReadableKueueMessage(KueueWorkloadStatus.Failed, undefined, 'test-queue'),
      ).toBe('Exceeded quota for test-queue');
    });
  });

  describe('Preempted status', () => {
    it('should always return the same fixed message regardless of raw message or queue', () => {
      expect(
        getHumanReadableKueueMessage(KueueWorkloadStatus.Preempted, 'any message', 'any-queue'),
      ).toBe('Paused by a higher-priority job');
      expect(getHumanReadableKueueMessage(KueueWorkloadStatus.Preempted)).toBe(
        'Paused by a higher-priority job',
      );
    });
  });

  describe('Evicted status', () => {
    it('should return queue stopped message when raw message mentions ClusterQueue stopped', () => {
      expect(
        getHumanReadableKueueMessage(
          KueueWorkloadStatus.Evicted,
          'ClusterQueue cluster-queue is stopped',
        ),
      ).toBe('Evicted: queue was stopped');
    });

    it('should return deactivated message when raw message mentions deactivation', () => {
      expect(
        getHumanReadableKueueMessage(KueueWorkloadStatus.Evicted, 'Workload was deactivated'),
      ).toBe('Evicted: workload was deactivated');
    });

    it('should return admission check message when raw message mentions admission check', () => {
      expect(
        getHumanReadableKueueMessage(
          KueueWorkloadStatus.Evicted,
          'At least one admission check transitioned to Retry',
        ),
      ).toBe('Evicted: admission check failed');
    });

    it('should prefix raw message with Evicted for unknown eviction reasons', () => {
      expect(
        getHumanReadableKueueMessage(KueueWorkloadStatus.Evicted, 'Some unknown eviction reason'),
      ).toBe('Evicted: Some unknown eviction reason');
    });

    it('should return generic eviction message when no raw message provided', () => {
      expect(getHumanReadableKueueMessage(KueueWorkloadStatus.Evicted)).toBe(
        'Evicted from the queue',
      );
    });
  });

  describe('Inadmissible status', () => {
    it('should return queue not found message when raw message mentions queue not found', () => {
      expect(
        getHumanReadableKueueMessage(
          KueueWorkloadStatus.Inadmissible,
          'ClusterQueue not found for local queue',
          'test-queue',
        ),
      ).toBe('Queue test-queue does not exist');
    });

    it('should return exceeded quota message when raw message mentions quota', () => {
      expect(
        getHumanReadableKueueMessage(
          KueueWorkloadStatus.Inadmissible,
          "couldn't assign flavors to pod set: insufficient unused quota",
          'test-queue',
        ),
      ).toBe('Exceeded quota for test-queue');
    });

    it('should return raw message as fallback for unrecognized inadmissible reasons', () => {
      expect(
        getHumanReadableKueueMessage(
          KueueWorkloadStatus.Inadmissible,
          'Namespace does not match cluster queue selector',
          'test-queue',
        ),
      ).toBe('Namespace does not match cluster queue selector');
    });

    it('should return neutral fallback message when no raw message provided', () => {
      expect(
        getHumanReadableKueueMessage(KueueWorkloadStatus.Inadmissible, undefined, 'test-queue'),
      ).toBe('Unable to admit workload to test-queue');
    });
  });

  describe('AdmissionCheck status', () => {
    it('should prefix any provided message with "Waiting for admission check:"', () => {
      expect(
        getHumanReadableKueueMessage(KueueWorkloadStatus.AdmissionCheck, 'no GPU nodes available'),
      ).toBe('Waiting for admission check: no GPU nodes available');
      expect(
        getHumanReadableKueueMessage(KueueWorkloadStatus.AdmissionCheck, 'gpu-provisioner'),
      ).toBe('Waiting for admission check: gpu-provisioner');
    });

    it('should return generic message when no raw message provided', () => {
      expect(getHumanReadableKueueMessage(KueueWorkloadStatus.AdmissionCheck)).toBe(
        'Waiting for admission check to complete',
      );
    });
  });

  describe('Requeued status', () => {
    it('should return requeued message with raw message when provided', () => {
      expect(
        getHumanReadableKueueMessage(KueueWorkloadStatus.Requeued, 'Pods were not ready in time'),
      ).toBe('Re-queued: Pods were not ready in time');
    });

    it('should return generic requeued message when no raw message', () => {
      expect(getHumanReadableKueueMessage(KueueWorkloadStatus.Requeued)).toBe(
        'Re-queued, waiting to retry',
      );
    });
  });

  describe('other statuses', () => {
    it('should return raw message for Running status', () => {
      expect(getHumanReadableKueueMessage(KueueWorkloadStatus.Running, 'All pods are ready')).toBe(
        'All pods are ready',
      );
    });

    it('should return status name when no raw message for non-override status', () => {
      expect(getHumanReadableKueueMessage(KueueWorkloadStatus.Admitted)).toBe('Admitted');
    });
  });
});

describe('getRequeuedMessage', () => {
  it('should include retry count and next retry time when both present', () => {
    const result = getRequeuedMessage({
      status: KueueWorkloadStatus.Requeued,
      requeueInfo: { count: 3, requeueAt: '2026-02-16T08:05:00Z' },
    });
    expect(result).toContain('attempt 3');
    expect(result).toContain('next retry at');
  });

  it('should include only next retry time when count is 0', () => {
    const result = getRequeuedMessage({
      status: KueueWorkloadStatus.Requeued,
      requeueInfo: { count: 0, requeueAt: '2026-02-16T08:05:00Z' },
    });
    expect(result).toContain('next retry at');
    expect(result).not.toContain('attempt');
  });

  it('should include only retry count when no requeueAt', () => {
    const result = getRequeuedMessage({
      status: KueueWorkloadStatus.Requeued,
      requeueInfo: { count: 5 },
    });
    expect(result).toBe('Re-queued (attempt 5)');
  });

  it('should return generic message when no requeueInfo', () => {
    const result = getRequeuedMessage({
      status: KueueWorkloadStatus.Requeued,
    });
    expect(result).toBe('Re-queued, waiting to retry');
  });
});

describe('getPreemptionToastBody', () => {
  it('should include formatted timestamp when provided', () => {
    const result = getPreemptionToastBody('my-workbench', '2026-02-16T08:00:00Z');
    expect(result).toContain('Workbench my-workbench was preempted at');
    expect(result).toContain('by a higher-priority job and has been re-queued.');
  });

  it('should omit timestamp when not provided or explicitly undefined', () => {
    const expected =
      'Workbench my-workbench was preempted by a higher-priority job and has been re-queued.';
    expect(getPreemptionToastBody('my-workbench')).toBe(expected);
    expect(getPreemptionToastBody('my-workbench', undefined)).toBe(expected);
  });
});

describe('getKueueSubStepInfo', () => {
  describe('Re-queued: prefix', () => {
    it('applies prefix when recovery is true and status is Queued', () => {
      const result = getKueueSubStepInfo(KueueWorkloadStatus.Queued, undefined, 'my-queue', true);
      expect(result.label).toMatch(/^Re-queued:/);
    });

    it('does not apply prefix when recovery is false and status is Queued', () => {
      const result = getKueueSubStepInfo(KueueWorkloadStatus.Queued, undefined, 'my-queue', false);
      expect(result.label).not.toMatch(/^Re-queued:/);
    });

    it('does not apply prefix for non-Queued statuses even in recovery', () => {
      const result = getKueueSubStepInfo(
        KueueWorkloadStatus.Inadmissible,
        'LocalQueue no-lq does not exist',
        'no-lq',
        true,
      );
      expect(result.label).not.toMatch(/^Re-queued:/);
    });

    it('does not double-prefix for Requeued status in recovery', () => {
      const result = getKueueSubStepInfo(
        KueueWorkloadStatus.Requeued,
        'Pods were not ready in time',
        'my-queue',
        true,
      );
      expect(result.label).not.toMatch(/^Re-queued: Re-queued/);
    });
  });

  describe('admitted statuses', () => {
    it.each([
      KueueWorkloadStatus.Admitted,
      KueueWorkloadStatus.Running,
      KueueWorkloadStatus.Complete,
    ])('returns "Admitted to queue" label for %s', (status) => {
      expect(getKueueSubStepInfo(status, 'some message', 'my-queue', false).label).toBe(
        'Admitted to queue',
      );
    });
  });

  describe('label uses getHumanReadableKueueMessage output per status', () => {
    it.each([
      [
        KueueWorkloadStatus.AdmissionCheck,
        undefined,
        'q',
        'Waiting for admission check to complete',
      ],
      [
        KueueWorkloadStatus.BlockedOnPreemptionGates,
        undefined,
        'q',
        'Admitted but waiting for preemption gates to clear',
      ],
      [KueueWorkloadStatus.Inadmissible, undefined, 'q', 'Unable to admit workload to q'],
      [KueueWorkloadStatus.Evicted, undefined, 'q', 'Evicted from the queue'],
      [KueueWorkloadStatus.Preempted, undefined, 'q', 'Paused by a higher-priority job'],
      [KueueWorkloadStatus.Requeued, undefined, 'q', 'Re-queued, waiting to retry'],
      [KueueWorkloadStatus.Queued, undefined, 'q', 'Waiting for quota in q'],
    ] as const)('returns human-readable label for %s', (status, message, queueName, expected) => {
      expect(getKueueSubStepInfo(status, message, queueName, false).label).toBe(expected);
    });
  });

  describe('queue position', () => {
    it('appends position to label when Queued and position is provided', () => {
      const result = getKueueSubStepInfo(
        KueueWorkloadStatus.Queued,
        undefined,
        'my-queue',
        false,
        3,
      );
      expect(result.label).toContain('position 3');
    });

    it('does not append position for non-Queued statuses', () => {
      const result = getKueueSubStepInfo(
        KueueWorkloadStatus.Inadmissible,
        'LocalQueue does not exist',
        'my-queue',
        false,
        3,
      );
      expect(result.label).not.toContain('position');
    });
  });
});

describe('getEvictionToastBody', () => {
  it('should normalize known reason (queue stopped)', () => {
    const result = getEvictionToastBody('my-workbench', 'ClusterQueue default is stopped');
    expect(result).toBe('Workbench my-workbench was evicted: queue was stopped');
  });

  it('should normalize known reason (deactivated)', () => {
    const result = getEvictionToastBody('my-workbench', 'Workload was deactivated');
    expect(result).toBe('Workbench my-workbench was evicted: workload was deactivated');
  });

  it('should pass through unknown reason as-is', () => {
    const result = getEvictionToastBody('my-workbench', 'Some unexpected eviction reason');
    expect(result).toBe('Workbench my-workbench was evicted: Some unexpected eviction reason');
  });

  it('should return generic message when no reason provided or reason is blank', () => {
    const expected = 'Workbench my-workbench was evicted from the queue.';
    expect(getEvictionToastBody('my-workbench')).toBe(expected);
    expect(getEvictionToastBody('my-workbench', '  ')).toBe(expected);
  });
});
