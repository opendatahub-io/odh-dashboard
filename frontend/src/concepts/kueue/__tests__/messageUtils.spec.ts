import { KueueWorkloadStatus } from '#~/concepts/kueue/types';
import {
  getHumanReadableKueueMessage,
  getPreemptionToastBody,
  getEvictionToastBody,
  getRequeuedMessage,
} from '#~/concepts/kueue/messageUtils';

describe('getHumanReadableKueueMessage', () => {
  describe('Queued status', () => {
    it('should return quota waiting message when raw message mentions insufficient quota', () => {
      expect(
        getHumanReadableKueueMessage(
          KueueWorkloadStatus.Queued,
          "couldn't assign flavors to pod set 7273a338: insufficient unused quota for cpu in flavor workbench-test-flavor",
          'test-queue',
        ),
      ).toBe('Waiting for quota in test-queue');
    });

    it('should return quota waiting message when raw message mentions flavor assignment', () => {
      expect(
        getHumanReadableKueueMessage(
          KueueWorkloadStatus.Queued,
          "couldn't assign flavors to pod set main",
          'my-queue',
        ),
      ).toBe('Waiting for quota in my-queue');
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

    it('should return quota waiting message when no raw message provided', () => {
      expect(
        getHumanReadableKueueMessage(KueueWorkloadStatus.Queued, undefined, 'test-queue'),
      ).toBe('Waiting for quota in test-queue');
    });

    it('should use "the queue" when queue name is not provided', () => {
      expect(getHumanReadableKueueMessage(KueueWorkloadStatus.Queued, undefined)).toBe(
        'Waiting for quota in the queue',
      );
    });
  });

  describe('Failed status', () => {
    it('should return queue not found message when raw message mentions queue not found', () => {
      expect(
        getHumanReadableKueueMessage(
          KueueWorkloadStatus.Failed,
          'ClusterQueue not found',
          'test-queue',
        ),
      ).toBe('Queue test-queue does not exist');
    });

    it('should return queue not found message when raw message mentions queue not exist', () => {
      expect(
        getHumanReadableKueueMessage(
          KueueWorkloadStatus.Failed,
          'queue does not exist',
          'my-queue',
        ),
      ).toBe('Queue my-queue does not exist');
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
    it('should return preemption message regardless of raw message', () => {
      expect(
        getHumanReadableKueueMessage(
          KueueWorkloadStatus.Preempted,
          'Preempted by higher priority workload',
          'test-queue',
        ),
      ).toBe('Paused by a higher-priority job');
    });

    it('should return preemption message when no raw message provided', () => {
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

    it('should return queue not found message when no raw message provided', () => {
      expect(
        getHumanReadableKueueMessage(KueueWorkloadStatus.Inadmissible, undefined, 'test-queue'),
      ).toBe('Queue test-queue does not exist');
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

  it('should omit timestamp when not provided', () => {
    const result = getPreemptionToastBody('my-workbench');
    expect(result).toBe(
      'Workbench my-workbench was preempted by a higher-priority job and has been re-queued.',
    );
  });

  it('should omit timestamp when undefined', () => {
    const result = getPreemptionToastBody('my-workbench', undefined);
    expect(result).toBe(
      'Workbench my-workbench was preempted by a higher-priority job and has been re-queued.',
    );
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

  it('should return generic message when no reason', () => {
    const result = getEvictionToastBody('my-workbench');
    expect(result).toBe('Workbench my-workbench was evicted from the queue.');
  });

  it('should return generic message when reason is empty', () => {
    const result = getEvictionToastBody('my-workbench', '  ');
    expect(result).toBe('Workbench my-workbench was evicted from the queue.');
  });
});
