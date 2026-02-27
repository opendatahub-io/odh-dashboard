import { KueueWorkloadStatus } from './types';

const QUOTA_REGEX = /insufficient unused quota|quota.*exceed|exceed.*quota/i;
const QUEUE_NOT_FOUND_REGEX =
  /queue.*not\s*(found|exist)|not\s*(found|exist).*queue|clusterqueue.*not\s*(found|exist)/i;
const TIMEOUT_REGEX = /timed?\s*out|timeout/i;
const FLAVOR_REGEX = /couldn't assign flavors|flavor/i;

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
    case KueueWorkloadStatus.Inadmissible:
      return getInadmissibleMessage(message, queue);
    default:
      return message || status;
  }
};

const getQueuedMessage = (rawMessage: string | undefined, queue: string): string => {
  if (!rawMessage) {
    return `Waiting for quota in ${queue}`;
  }
  if (QUOTA_REGEX.test(rawMessage) || FLAVOR_REGEX.test(rawMessage)) {
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
    const formatted = date.toLocaleString();
    return `Workbench ${workbenchName} was preempted at ${formatted} by a higher-priority job and has been re-queued.`;
  }
  return `Workbench ${workbenchName} was preempted by a higher-priority job and has been re-queued.`;
};
