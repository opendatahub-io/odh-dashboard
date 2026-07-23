import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InProgressIcon,
  OutlinedClockIcon,
  RebootingIcon,
} from '@patternfly/react-icons';
import type { WorkloadCondition, WorkloadKind } from '#~/k8sTypes';

import {
  KueueWorkloadStatus,
  type KueueStatusInfo,
  type KueueWorkloadStatusWithMessage,
} from './types';

export const KUEUE_QUEUE_LABEL = 'kueue.x-k8s.io/queue-name';

const CONDITION_STATUS = { True: 'True', False: 'False' } as const;
const CONDITION_TYPE = {
  Finished: 'Finished',
  Evicted: 'Evicted',
  Preempted: 'Preempted',
  QuotaReserved: 'QuotaReserved',
  PodsReady: 'PodsReady',
  Admitted: 'Admitted',
  BlockedOnPreemptionGates: 'BlockedOnPreemptionGates',
} as const;

const EVICTION_REASON = {
  Preempted: 'Preempted',
  PodsReadyTimeout: 'PodsReadyTimeout',
} as const;

const FAILURE_REGEX = /error|failed|rejected|timeout|timed out/;
const SUCCESS_REGEX = /success|succeeded/;

type ExtractedConditions = {
  Failed: WorkloadCondition | undefined;
  Succeeded: WorkloadCondition | undefined;
  Evicted: WorkloadCondition | undefined;
  Preempted: WorkloadCondition | undefined;
  Inadmissible: WorkloadCondition | undefined;
  BlockedOnPreemptionGates: WorkloadCondition | undefined;
  Pending: WorkloadCondition | undefined;
  Running: WorkloadCondition | undefined;
  Admitted: WorkloadCondition | undefined;
};

const extractWorkloadConditions = (conditions: WorkloadCondition[]): ExtractedConditions => {
  let failedCondition: WorkloadCondition | undefined;
  let succeededCondition: WorkloadCondition | undefined;
  let succeededFallback: WorkloadCondition | undefined;

  for (const condition of conditions) {
    if (condition.status !== CONDITION_STATUS.True || condition.type !== CONDITION_TYPE.Finished) {
      continue;
    }
    const conditionText = `${condition.message || ''} ${condition.reason || ''}`.toLowerCase();
    if (FAILURE_REGEX.test(conditionText)) {
      if (failedCondition === undefined) failedCondition = condition;
    } else {
      if (succeededFallback === undefined) succeededFallback = condition;
      if (succeededCondition === undefined && SUCCESS_REGEX.test(conditionText)) {
        succeededCondition = condition;
      }
    }
  }

  return {
    Failed: failedCondition,
    Succeeded: succeededCondition !== undefined ? succeededCondition : succeededFallback,
    Evicted: conditions.find(
      ({ type, status }) => type === CONDITION_TYPE.Evicted && status === CONDITION_STATUS.True,
    ),
    Preempted: conditions.find(
      ({ type, status }) => type === CONDITION_TYPE.Preempted && status === CONDITION_STATUS.True,
    ),
    Inadmissible: conditions.find(
      ({ type, status, reason }) =>
        type === CONDITION_TYPE.QuotaReserved &&
        status === CONDITION_STATUS.False &&
        reason === 'Inadmissible',
    ),
    BlockedOnPreemptionGates: conditions.find(
      ({ type, status }) =>
        type === CONDITION_TYPE.BlockedOnPreemptionGates && status === CONDITION_STATUS.True,
    ),
    Pending: conditions.find(
      ({ type, status }) =>
        type === CONDITION_TYPE.QuotaReserved && status === CONDITION_STATUS.False,
    ),
    Running: conditions.find(
      ({ type, status }) => type === CONDITION_TYPE.PodsReady && status === CONDITION_STATUS.True,
    ),
    Admitted: conditions.find(
      ({ type, status }) => type === CONDITION_TYPE.Admitted && status === CONDITION_STATUS.True,
    ),
  };
};

/** Maps an Evicted condition to Preempted, Requeued, or Evicted based on its reason. */
const resolveEvictedStatus = (
  evictedCondition: WorkloadCondition,
  workload: WorkloadKind,
): KueueWorkloadStatus => {
  if (evictedCondition.reason === EVICTION_REASON.Preempted) {
    return KueueWorkloadStatus.Preempted;
  }
  if (
    evictedCondition.reason === EVICTION_REASON.PodsReadyTimeout &&
    workload.status?.requeueState != null
  ) {
    return KueueWorkloadStatus.Requeued;
  }
  return KueueWorkloadStatus.Evicted;
};

const getMessageFromCondition = (condition: WorkloadCondition | undefined): string | undefined => {
  if (!condition) return undefined;
  const s = (condition.message || condition.reason || '').trim();
  return s || undefined;
};

/** Returns the first True condition with a message whose type is not otherwise handled. */
const findUnknownConditionFallback = (
  conditions: WorkloadCondition[],
  extracted: ExtractedConditions,
): WorkloadCondition | undefined => {
  const knownTypes: Set<string> = new Set(Object.values(CONDITION_TYPE));
  return conditions.find(
    (c) =>
      c.status === CONDITION_STATUS.True &&
      !knownTypes.has(c.type) &&
      !Object.values(extracted).includes(c) &&
      (c.message || c.reason),
  );
};

/**
 * Returns Kueue status and message for a Workload from its conditions.
 * Priority: Failed → Evicted/Requeued → Inadmissible → BlockedOnPreemptionGates → Preempted → Succeeded → Running → Admitted → Queued → UnknownFallback.
 */
type AdmissionCheckEntry = NonNullable<
  NonNullable<WorkloadKind['status']>['admissionChecks']
>[number];

/** Returns the first blocking admission check (Pending or Retry), or undefined if none. */
const findBlockingAdmissionCheck = (workload: WorkloadKind): AdmissionCheckEntry | undefined => {
  const checks = workload.status?.admissionChecks;
  return checks?.find(({ state }) => state === 'Pending' || state === 'Retry');
};

export const getKueueWorkloadStatusWithMessage = (
  workload: WorkloadKind,
): KueueWorkloadStatusWithMessage => {
  const conditions = workload.status?.conditions ?? [];
  const extracted = extractWorkloadConditions(conditions);
  const {
    Failed,
    Inadmissible,
    Evicted,
    Preempted,
    Succeeded,
    Running,
    Admitted,
    Pending,
    BlockedOnPreemptionGates,
  } = extracted;

  const evictedStatus = Evicted ? resolveEvictedStatus(Evicted, workload) : undefined;

  const blockingCheck = findBlockingAdmissionCheck(workload);

  const priority: Array<{
    condition: WorkloadCondition | undefined;
    status: KueueWorkloadStatus;
  }> = [
    { condition: Failed, status: KueueWorkloadStatus.Failed },
    { condition: Evicted, status: evictedStatus ?? KueueWorkloadStatus.Evicted },
    { condition: Inadmissible, status: KueueWorkloadStatus.Inadmissible },
    { condition: BlockedOnPreemptionGates, status: KueueWorkloadStatus.BlockedOnPreemptionGates },
    { condition: Preempted, status: KueueWorkloadStatus.Preempted },
    { condition: Succeeded, status: KueueWorkloadStatus.Complete },
    { condition: Running, status: KueueWorkloadStatus.Running },
    { condition: Admitted, status: KueueWorkloadStatus.Admitted },
    { condition: Pending, status: KueueWorkloadStatus.Queued },
  ];

  const matched = priority.find((p) => p.condition);

  if (!matched) {
    const unknownFallback = findUnknownConditionFallback(conditions, extracted);
    if (unknownFallback) {
      return {
        status: KueueWorkloadStatus.Queued,
        message: getMessageFromCondition(unknownFallback),
        timestamp: unknownFallback.lastTransitionTime,
      };
    }
    return { status: KueueWorkloadStatus.Queued, message: undefined, timestamp: undefined };
  }

  // Admitted but a check is still blocking — surface AdmissionCheck for the progress tree.
  if (matched.status === KueueWorkloadStatus.Admitted && blockingCheck != null) {
    return {
      status: KueueWorkloadStatus.AdmissionCheck,
      message: blockingCheck.message || blockingCheck.name,
      timestamp: blockingCheck.lastTransitionTime,
    };
  }

  const result: KueueWorkloadStatusWithMessage = {
    status: matched.status,
    message: getMessageFromCondition(matched.condition),
    timestamp: matched.condition?.lastTransitionTime,
  };

  if (matched.status === KueueWorkloadStatus.Requeued && workload.status?.requeueState) {
    result.requeueInfo = {
      count: workload.status.requeueState.count ?? 0,
      requeueAt: workload.status.requeueState.requeueAt,
    };
  }

  return result;
};

export const getKueueStatusInfo = (status: KueueWorkloadStatus): KueueStatusInfo => {
  switch (status) {
    case KueueWorkloadStatus.Queued:
      return { label: 'Queued', color: 'grey', IconComponent: OutlinedClockIcon };
    case KueueWorkloadStatus.Failed:
      return {
        label: 'Failed',
        status: 'danger',
        IconComponent: ExclamationCircleIcon,
      };
    case KueueWorkloadStatus.Preempted:
      return {
        label: 'Preempted',
        status: 'warning',
        IconComponent: ExclamationTriangleIcon,
      };
    case KueueWorkloadStatus.Evicted:
      return {
        label: 'Evicted',
        status: 'warning',
        IconComponent: ExclamationTriangleIcon,
      };
    case KueueWorkloadStatus.Requeued:
      return {
        label: 'Requeued',
        color: 'blue',
        IconComponent: RebootingIcon,
      };
    case KueueWorkloadStatus.Inadmissible:
      return {
        label: 'Inadmissible',
        status: 'warning',
        IconComponent: ExclamationTriangleIcon,
      };
    case KueueWorkloadStatus.AdmissionCheck:
      return {
        label: 'Admission check',
        color: 'blue',
        IconComponent: InProgressIcon,
        iconClassName: 'ai-u-spin',
      };
    case KueueWorkloadStatus.BlockedOnPreemptionGates:
      return {
        label: 'Blocked on preemption',
        color: 'blue',
        IconComponent: InProgressIcon,
        iconClassName: 'ai-u-spin',
      };
    case KueueWorkloadStatus.Running:
      return { label: 'Running', color: 'blue', IconComponent: InProgressIcon };
    case KueueWorkloadStatus.Admitted:
      return {
        label: 'Starting',
        color: 'blue',
        IconComponent: InProgressIcon,
        iconClassName: 'ai-u-spin',
      };
    case KueueWorkloadStatus.Complete:
      return {
        label: 'Complete',
        status: 'success',
        IconComponent: CheckCircleIcon,
      };
    default:
      return { label: status, color: 'grey', IconComponent: OutlinedClockIcon };
  }
};
