import { KueueWorkloadStatus } from '#~/concepts/kueue/types';
import {
  getHumanReadableKueueMessage,
  getPreemptionToastBody,
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
