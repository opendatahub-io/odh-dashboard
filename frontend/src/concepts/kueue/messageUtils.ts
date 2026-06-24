import { KueueWorkloadStatus, type KueueWorkloadStatusWithMessage } from './types';

const QUOTA_REGEX = /insufficient unused quota|quota.*exceed|exceed.*quota/i;
const QUEUE_NOT_FOUND_REGEX =
  /queue.*not\s*(found|exist)|not\s*(found|exist).*queue|clusterqueue.*not\s*(found|exist)/i;
const TIMEOUT_REGEX = /timed?\s*out|timeout/i;
const FLAVOR_REGEX = /couldn't assign flavors|flavor/i;
const QUEUE_STOPPED_REGEX = /clusterqueue.*stop|stop.*clusterqueue/i;
const DEACTIVATED_REGEX = /deactivat/i;
const ADMISSION_CHECK_REGEX = /admission\s*check/i;

/**
 * Converts raw Kueue condition messages into human-readable text for the UI.
 * Falls back to the raw message if no pattern matches.
 */
export const getHumanReadableKueueMessage = (
  status: KueueWorkloadStatus,
  rawMessage?: string,
  queueName?: string,
): string => {
  const queue = queueName ?? 'the queue';
  const message = rawMessage?.trim() || undefined;

  switch (status) {
    case KueueWorkloadStatus.Queued:
      return getQueuedMessage(message, queue);
    case KueueWorkloadStatus.Failed:
      return getFailedMessage(message, queue);
    case KueueWorkloadStatus.Preempted:
      return 'Paused by a higher-priority job';
    case KueueWorkloadStatus.Evicted:
      return getEvictedMessage(message);
    case KueueWorkloadStatus.Requeued:
      return message ? `Re-queued: ${message}` : 'Re-queued, waiting to retry';
    case KueueWorkloadStatus.Inadmissible:
      return getInadmissibleMessage(message, queue);
    default:
      return message || status;
  }
};

/**
 * Returns a human-readable message for Requeued status including retry info.
 */
export const getRequeuedMessage = (info: KueueWorkloadStatusWithMessage): string => {
  const count = info.requeueInfo?.count ?? 0;
  const requeueAt = info.requeueInfo?.requeueAt;

  if (requeueAt) {
    const date = new Date(requeueAt);
    if (!Number.isNaN(date.getTime())) {
      const formatted = date.toLocaleString();
      return count > 0
        ? `Re-queued (attempt ${count}, next retry at ${formatted})`
        : `Re-queued (next retry at ${formatted})`;
    }
  }
  return count > 0 ? `Re-queued (attempt ${count})` : 'Re-queued, waiting to retry';
};

const getQueuedMessage = (rawMessage: string | undefined, queue: string): string => {
  if (!rawMessage || QUOTA_REGEX.test(rawMessage) || FLAVOR_REGEX.test(rawMessage)) {
    return `Waiting for quota in ${queue}`;
  }
  return `Waiting for available resources`;
};

const getFailedMessage = (rawMessage: string | undefined, queue: string): string => {
  if (!rawMessage) {
    return `Exceeded quota for ${queue}`;
  }
  if (QUEUE_NOT_FOUND_REGEX.test(rawMessage)) {
    return `Queue ${queue} does not exist`;
  }
  if (TIMEOUT_REGEX.test(rawMessage)) {
    return `Queue timed out`;
  }
  if (QUOTA_REGEX.test(rawMessage)) {
    return `Exceeded quota for ${queue}`;
  }
  return rawMessage.trim();
};

const getEvictionReason = (rawMessage: string | undefined): string | undefined => {
  if (!rawMessage) {
    return undefined;
  }
  if (QUEUE_STOPPED_REGEX.test(rawMessage)) {
    return 'queue was stopped';
  }
  if (DEACTIVATED_REGEX.test(rawMessage)) {
    return 'workload was deactivated';
  }
  if (ADMISSION_CHECK_REGEX.test(rawMessage)) {
    return 'admission check failed';
  }
  return rawMessage.trim() || undefined;
};

const getEvictedMessage = (rawMessage: string | undefined): string => {
  const reason = getEvictionReason(rawMessage);
  return reason ? `Evicted: ${reason}` : 'Evicted from the queue';
};

const getInadmissibleMessage = (rawMessage: string | undefined, queue: string): string => {
  if (!rawMessage) {
    return `Queue ${queue} does not exist`;
  }
  if (QUEUE_NOT_FOUND_REGEX.test(rawMessage)) {
    return `Queue ${queue} does not exist`;
  }
  if (QUOTA_REGEX.test(rawMessage) || FLAVOR_REGEX.test(rawMessage)) {
    return `Exceeded quota for ${queue}`;
  }
  return rawMessage.trim();
};

/**
 * Formats a preemption toast body message with the workbench name and timestamp.
 */
export const getPreemptionToastBody = (workbenchName: string, timestamp?: string): string => {
  if (timestamp) {
    const date = new Date(timestamp);
    if (!Number.isNaN(date.getTime())) {
      const formatted = date.toLocaleString();
      return `Workbench ${workbenchName} was preempted at ${formatted} by a higher-priority job and has been re-queued.`;
    }
  }
  return `Workbench ${workbenchName} was preempted by a higher-priority job and has been re-queued.`;
};

/**
 * Formats an eviction toast body message with the workbench name and reason.
 */
export const getEvictionToastBody = (workbenchName: string, rawMessage?: string): string => {
  const reason = getEvictionReason(rawMessage);
  if (reason) {
    return `Workbench ${workbenchName} was evicted: ${reason}`;
  }
  return `Workbench ${workbenchName} was evicted from the queue.`;
};
