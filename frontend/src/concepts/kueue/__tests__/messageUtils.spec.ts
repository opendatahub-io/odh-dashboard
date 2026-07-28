import { KueueWorkloadStatus, type KueueWorkloadStatusWithMessage } from '#~/concepts/kueue/types';
import {
  getHumanReadableKueueMessage,
  getKueueSubStepInfo,
  getPreemptionToastBody,
  getEvictionToastBody,
  getRequeuedMessage,
  getKueueAnalyticsSubState,
  toOrdinal,
  formatQueuePosition,
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

    it('should return resources waiting message for non-quota reasons', () => {
      expect(
        getHumanReadableKueueMessage(
          KueueWorkloadStatus.Queued,
          'some other reason for waiting',
          'test-queue',
        ),
      ).toBe('Waiting for resources in test-queue');
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
      ).toBe('Paused by higher-priority job');
      expect(getHumanReadableKueueMessage(KueueWorkloadStatus.Preempted)).toBe(
        'Paused by higher-priority job',
      );
    });
  });

  describe('Evicted status', () => {
    it('should return manually removed message when raw message mentions ClusterQueue stopped', () => {
      expect(
        getHumanReadableKueueMessage(
          KueueWorkloadStatus.Evicted,
          'ClusterQueue cluster-queue is stopped',
        ),
      ).toBe('Manually removed from queue');
    });

    it('should return deactivated message when raw message mentions deactivation', () => {
      expect(
        getHumanReadableKueueMessage(KueueWorkloadStatus.Evicted, 'Workload was deactivated'),
      ).toBe('Deactivated');
    });

    it('should return admission check failed message when raw message mentions admission check', () => {
      expect(
        getHumanReadableKueueMessage(
          KueueWorkloadStatus.Evicted,
          'At least one admission check transitioned to Retry',
        ),
      ).toBe('Admission check failed');
    });

    it('should return raw message for unknown eviction reasons', () => {
      expect(
        getHumanReadableKueueMessage(KueueWorkloadStatus.Evicted, 'Some unknown eviction reason'),
      ).toBe('Some unknown eviction reason');
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
    it('should return resources waiting message for non-quota Requeued reason', () => {
      expect(
        getHumanReadableKueueMessage(
          KueueWorkloadStatus.Requeued,
          'Pods were not ready in time',
          'test-queue',
        ),
      ).toBe('Waiting for resources in test-queue');
    });

    it('should return quota waiting message when no raw message', () => {
      expect(
        getHumanReadableKueueMessage(KueueWorkloadStatus.Requeued, undefined, 'test-queue'),
      ).toBe('Waiting for quota in test-queue');
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
  it('should include attempt count when provided', () => {
    const result = getRequeuedMessage({
      status: KueueWorkloadStatus.Requeued,
      requeueInfo: { count: 3 },
      queueName: 'test-queue',
      message: 'insufficient unused quota',
    });
    expect(result).toContain('attempt 3');
    expect(result).toContain('test-queue');
  });

  it('should include next retry time when requeueAt is provided', () => {
    const result = getRequeuedMessage({
      status: KueueWorkloadStatus.Requeued,
      requeueInfo: { count: 3, requeueAt: '2026-07-23T05:00:00.000Z' },
      queueName: 'test-queue',
    });
    expect(result).toContain('attempt 3');
    expect(result).toContain('next retry at');
  });

  it('should include only next retry time when count is zero', () => {
    const result = getRequeuedMessage({
      status: KueueWorkloadStatus.Requeued,
      requeueInfo: { count: 0, requeueAt: '2026-07-23T05:00:00.000Z' },
      queueName: 'test-queue',
    });
    expect(result).not.toContain('attempt');
    expect(result).toContain('next retry at');
  });

  it('should return base queue message when no requeueInfo', () => {
    const result = getRequeuedMessage({
      status: KueueWorkloadStatus.Requeued,
    });
    expect(result).toBe('Waiting for quota in the queue');
  });

  it('should fall back to "the queue" when no queueName provided', () => {
    const result = getRequeuedMessage({
      status: KueueWorkloadStatus.Requeued,
      requeueInfo: { count: 5 },
    });
    expect(result).toBe('Waiting for quota in the queue (attempt 5)');
  });
});

describe('toOrdinal', () => {
  it.each<[number, string]>([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [11, '11th'],
    [12, '12th'],
    [13, '13th'],
    [21, '21st'],
    [22, '22nd'],
    [23, '23rd'],
    [100, '100th'],
    [101, '101st'],
  ])('should return %s as %s', (n, expected) => {
    expect(toOrdinal(n)).toBe(expected);
  });
});

describe('formatQueuePosition', () => {
  it.each<[number, string, string]>([
    [3, 'my-queue', '3rd in my-queue'],
    [2, 'test-queue', '2nd in test-queue'],
  ])('formats position %s in %s as %s', (position, queue, expected) => {
    expect(formatQueuePosition(position, queue)).toBe(expected);
  });
});

describe('getPreemptionToastBody', () => {
  it('should include formatted timestamp and reentered message when timestamp provided', () => {
    const result = getPreemptionToastBody('my-workbench', '2026-02-16T08:00:00Z');
    expect(result).toContain('Workbench my-workbench was preempted at');
    expect(result).toContain('by a higher-priority job. It has reentered the queue.');
  });

  it('should omit timestamp and use reentered message when not provided', () => {
    const expected =
      'Workbench my-workbench was preempted by a higher-priority job. It has reentered the queue.';
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
      [KueueWorkloadStatus.Preempted, undefined, 'q', 'Paused by higher-priority job'],
      [KueueWorkloadStatus.Requeued, undefined, 'q', 'Waiting for quota in q'],
      [KueueWorkloadStatus.Queued, undefined, 'q', 'Waiting for quota in q'],
    ] as const)('returns human-readable label for %s', (status, message, queueName, expected) => {
      expect(getKueueSubStepInfo(status, message, queueName, false).label).toBe(expected);
    });
  });

  describe('queue position', () => {
    it('appends ordinal position to label when Queued and position is provided', () => {
      const result = getKueueSubStepInfo(
        KueueWorkloadStatus.Queued,
        undefined,
        'my-queue',
        false,
        3,
      );
      expect(result.label).toContain('3rd in my-queue');
    });

    it('does not append position for non-Queued statuses', () => {
      const result = getKueueSubStepInfo(
        KueueWorkloadStatus.Inadmissible,
        'LocalQueue does not exist',
        'my-queue',
        false,
        3,
      );
      expect(result.label).not.toContain('in queue');
    });
  });
});

describe('getEvictionToastBody', () => {
  it('should use mapped reason for queue stopped eviction', () => {
    const result = getEvictionToastBody('my-workbench', 'ClusterQueue default is stopped');
    expect(result).toBe('Workbench my-workbench was evicted: Manually removed from queue');
  });

  it('should use mapped reason for deactivated eviction', () => {
    const result = getEvictionToastBody('my-workbench', 'Workload was deactivated');
    expect(result).toBe('Workbench my-workbench was evicted: Deactivated');
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

  it('should include formatted timestamp when provided', () => {
    const result = getEvictionToastBody(
      'my-workbench',
      'ClusterQueue default is stopped',
      '2026-02-16T08:00:00Z',
    );
    expect(result).toContain('was evicted at');
    expect(result).toContain('Manually removed from queue');
  });
});

describe('getKueueAnalyticsSubState', () => {
  const status = (
    value: KueueWorkloadStatus,
    message?: string,
  ): KueueWorkloadStatusWithMessage => ({ status: value, message });

  it.each([
    ['none when status is missing', null, 'none'],
    ['admitted', status(KueueWorkloadStatus.Admitted), 'admitted'],
    ['preempted', status(KueueWorkloadStatus.Preempted), 'preempted'],
    [
      'queued with no message as waiting_for_quota',
      status(KueueWorkloadStatus.Queued),
      'waiting_for_quota',
    ],
    [
      'queued quota message as waiting_for_quota',
      status(KueueWorkloadStatus.Queued, 'insufficient unused quota'),
      'waiting_for_quota',
    ],
    [
      'queued non-quota message as waiting_for_resources',
      status(KueueWorkloadStatus.Queued, 'waiting for pods'),
      'waiting_for_resources',
    ],
    [
      'failed queue-not-found as invalid_queue',
      status(KueueWorkloadStatus.Failed, 'queue not found'),
      'invalid_queue',
    ],
    [
      'failed timeout as timeout',
      status(KueueWorkloadStatus.Failed, 'admission timed out'),
      'timeout',
    ],
    [
      'inadmissible with no message as quota_exceeded',
      status(KueueWorkloadStatus.Inadmissible),
      'quota_exceeded',
    ],
    ['running as none', status(KueueWorkloadStatus.Running), 'none'],
    ['evicted as none', status(KueueWorkloadStatus.Evicted), 'none'],
  ] as const)('%s', (_label, input, expected) => {
    expect(getKueueAnalyticsSubState(input)).toBe(expected);
  });
});
