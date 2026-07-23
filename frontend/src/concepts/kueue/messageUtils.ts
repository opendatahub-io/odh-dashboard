import { KueueWorkloadStatus, type KueueWorkloadStatusWithMessage } from './types';

const QUOTA_REGEX = /insufficient unused quota|quota.*exceed|exceed.*quota/i;
const QUEUE_NOT_FOUND_REGEX =
  /\b(?:cluster|local)?queue\b.*(?:not\s*(?:found|exist|existing)|does(?:n't| not)\s+exist)|(?:not\s*(?:found|exist|existing)|does(?:n't| not)\s+exist).*\b(?:cluster|local)?queue\b/i;
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
      return 'Paused by higher-priority job';
    case KueueWorkloadStatus.Evicted:
      return getEvictedMessage(message);
    case KueueWorkloadStatus.Requeued:
      return getQueuedMessage(message, queue);
    case KueueWorkloadStatus.Inadmissible:
      return getInadmissibleMessage(message, queue);
    case KueueWorkloadStatus.AdmissionCheck:
      return getAdmissionCheckMessage(message);
    case KueueWorkloadStatus.BlockedOnPreemptionGates:
      return 'Admitted but waiting for preemption gates to clear';
    default:
      return message || status;
  }
};

/**
 * Returns a human-readable message for Requeued status including retry info.
 * Drops requeueAt display; uses the same queued message pattern with attempt count appended.
 */
export const getRequeuedMessage = (info: KueueWorkloadStatusWithMessage): string => {
  const count = info.requeueInfo?.count ?? 0;
  const queue = info.queueName ?? 'the queue';
  const base = getQueuedMessage(info.message, queue);
  return count > 0 ? `${base} (attempt ${count})` : base;
};

const getQueuedMessage = (rawMessage: string | undefined, queue: string): string => {
  if (!rawMessage || QUOTA_REGEX.test(rawMessage) || FLAVOR_REGEX.test(rawMessage)) {
    return `Waiting for quota in ${queue}`;
  }
  return `Waiting for resources in ${queue}`;
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
    return 'Manually removed from queue';
  }
  if (DEACTIVATED_REGEX.test(rawMessage)) {
    return 'Deactivated';
  }
  if (ADMISSION_CHECK_REGEX.test(rawMessage)) {
    return 'Admission check failed';
  }
  return rawMessage.trim() || undefined;
};

const getEvictedMessage = (rawMessage: string | undefined): string => {
  const reason = getEvictionReason(rawMessage);
  return reason ?? 'Evicted from the queue';
};

const getAdmissionCheckMessage = (rawMessage: string | undefined): string =>
  rawMessage
    ? `Waiting for admission check: ${rawMessage}`
    : 'Waiting for admission check to complete';

const getInadmissibleMessage = (rawMessage: string | undefined, queue: string): string => {
  if (!rawMessage) {
    return `Unable to admit workload to ${queue}`;
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
 * Converts a positive integer to its ordinal string representation (e.g. 1 → "1st", 3 → "3rd").
 */
export const toOrdinal = (n: number): string => {
  const v = n % 100;
  if ([11, 12, 13].includes(v)) return `${n}th`;
  const r = n % 10;
  if (r === 1) return `${n}st`;
  if (r === 2) return `${n}nd`;
  if (r === 3) return `${n}rd`;
  return `${n}th`;
};

/** e.g. (3, 'my-queue') → "3rd in my-queue". Falls back to "3rd in queue". */
export const formatQueuePosition = (position: number, queue?: string): string =>
  `${toOrdinal(position)} in ${queue ?? 'queue'}`;

/**
 * Formats a preemption toast body message with the workbench name and timestamp.
 */
export const getPreemptionToastBody = (workbenchName: string, timestamp?: string): string => {
  if (timestamp) {
    const date = new Date(timestamp);
    if (!Number.isNaN(date.getTime())) {
      const formatted = date.toLocaleString();
      return `Workbench ${workbenchName} was preempted at ${formatted} by a higher-priority job. It has reentered the queue.`;
    }
  }
  return `Workbench ${workbenchName} was preempted by a higher-priority job. It has reentered the queue.`;
};

/**
 * Formats an eviction toast body message with the workbench name, optional timestamp, and reason.
 */
export const getEvictionToastBody = (
  workbenchName: string,
  rawMessage?: string,
  timestamp?: string,
): string => {
  const reason = getEvictionReason(rawMessage);
  let timeStr = '';
  if (timestamp) {
    const date = new Date(timestamp);
    if (!Number.isNaN(date.getTime())) {
      timeStr = ` at ${date.toLocaleString()}`;
    }
  }
  if (reason) {
    return `Workbench ${workbenchName} was evicted${timeStr}: ${reason}`;
  }
  return `Workbench ${workbenchName} was evicted${timeStr} from the queue.`;
};

/**
 * Analytics kueueSubState values from the UX tracking sheet.
 * Mapped from KueueWorkloadStatus + existing UI message heuristics (messageUtils).
 */
export type KueueSubState =
  | 'waiting_for_quota'
  | 'waiting_for_resources'
  | 'admitted'
  | 'quota_exceeded'
  | 'invalid_queue'
  | 'timeout'
  | 'preempted'
  | 'none';

/**
 * Derives the Amplitude/Segment `kueueSubState` property using the same message
 * heuristics as getHumanReadableKueueMessage. Statuses without a sheet mapping return 'none'.
 */
export const getKueueAnalyticsSubState = (
  kueueStatus: KueueWorkloadStatusWithMessage | null | undefined,
): KueueSubState => {
  if (!kueueStatus?.status) {
    return 'none';
  }

  const message = kueueStatus.message?.trim();

  switch (kueueStatus.status) {
    case KueueWorkloadStatus.Admitted:
      return 'admitted';
    case KueueWorkloadStatus.Preempted:
      return 'preempted';
    case KueueWorkloadStatus.Queued:
      if (!message || QUOTA_REGEX.test(message) || FLAVOR_REGEX.test(message)) {
        return 'waiting_for_quota';
      }
      return 'waiting_for_resources';
    case KueueWorkloadStatus.Failed:
    case KueueWorkloadStatus.Inadmissible:
      if (message && QUEUE_NOT_FOUND_REGEX.test(message)) {
        return 'invalid_queue';
      }
      if (message && TIMEOUT_REGEX.test(message)) {
        return 'timeout';
      }
      if (!message || QUOTA_REGEX.test(message) || FLAVOR_REGEX.test(message)) {
        return 'quota_exceeded';
      }
      return 'none';
    default:
      return 'none';
  }
};

/**
 * Returns the label for the Kueue sub-step in the progress tree.
 * Adds a "Re-queued:" prefix only for the Queued state during a recovery, and appends queue position when available.
 */
export const getKueueSubStepInfo = (
  status: KueueWorkloadStatus,
  message: string | undefined,
  queueName: string | undefined,
  isRecovery: boolean,
  queuePosition?: number,
): { label: string } => {
  const admitted =
    status === KueueWorkloadStatus.Admitted ||
    status === KueueWorkloadStatus.Running ||
    status === KueueWorkloadStatus.Complete;

  if (admitted) {
    return { label: 'Admitted to queue' };
  }

  const raw = getHumanReadableKueueMessage(status, message, queueName);

  const withRecovery =
    isRecovery && status === KueueWorkloadStatus.Queued ? `Re-queued: ${raw}` : raw;

  const label =
    status === KueueWorkloadStatus.Queued && queuePosition != null
      ? `${withRecovery} (${formatQueuePosition(queuePosition)})`
      : withRecovery;

  return { label };
};
