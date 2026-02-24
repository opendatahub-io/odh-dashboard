import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InProgressIcon,
  OutlinedClockIcon,
} from '@patternfly/react-icons';
import type { WorkloadCondition, WorkloadKind } from '#~/k8sTypes';

import {
  KueueWorkloadStatus,
  type KueueStatusInfo,
  type KueueWorkloadStatusWithMessage,
} from './types';

const CONDITION_STATUS = { True: 'True', False: 'False' } as const;
const CONDITION_TYPE = {
  Finished: 'Finished',
  Evicted: 'Evicted',
  Preempted: 'Preempted',
  QuotaReserved: 'QuotaReserved',
  PodsReady: 'PodsReady',
  Admitted: 'Admitted',
} as const;

const FAILURE_REGEX = /error|failed|rejected|timeout|timed out/;
const SUCCESS_REGEX = /success|succeeded/;

const extractWorkloadConditions = (
  conditions: WorkloadCondition[],
): Record<string, WorkloadCondition | undefined> => {
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

const getMessageFromCondition = (condition: WorkloadCondition | undefined): string | undefined => {
  if (!condition) return undefined;
  const s = (condition.message || condition.reason || '').trim();
  return s || undefined;
};

/**
 * Returns Kueue status and message for a Workload from its conditions.
 * Priority order (first match wins): Failed → Inadmissible → Preempted → Succeeded → Running → Admitted → Queued.
 */
export const getKueueWorkloadStatusWithMessage = (
  workload: WorkloadKind,
): KueueWorkloadStatusWithMessage => {
  const conditions = workload.status?.conditions ?? [];
  const { Failed, Inadmissible, Evicted, Preempted, Succeeded, Running, Admitted, Pending } =
    extractWorkloadConditions(conditions);

  const priority: Array<{
    condition: WorkloadCondition | undefined;
    status: KueueWorkloadStatus;
  }> = [
    { condition: Failed, status: KueueWorkloadStatus.Failed },
    { condition: Inadmissible, status: KueueWorkloadStatus.Inadmissible },
    { condition: Evicted, status: KueueWorkloadStatus.Preempted },
    { condition: Preempted, status: KueueWorkloadStatus.Preempted },
    { condition: Succeeded, status: KueueWorkloadStatus.Succeeded },
    { condition: Running, status: KueueWorkloadStatus.Running },
    { condition: Admitted, status: KueueWorkloadStatus.Admitted },
    { condition: Pending, status: KueueWorkloadStatus.Queued },
  ];
  const filteredWorkload = priority.find((p) => p.condition) ?? {
    condition: Pending,
    status: KueueWorkloadStatus.Queued,
  };

  return {
    status: filteredWorkload.status,
    message: getMessageFromCondition(filteredWorkload.condition),
  };
};

export const getKueueStatusInfo = (status: KueueWorkloadStatus): KueueStatusInfo => {
  switch (status) {
    case KueueWorkloadStatus.Queued:
      return { label: 'Queued', color: 'grey', IconComponent: OutlinedClockIcon };
    case KueueWorkloadStatus.Failed:
      return {
        label: 'Failed',
        status: 'danger',
        color: 'red',
        IconComponent: ExclamationCircleIcon,
      };
    case KueueWorkloadStatus.Preempted:
      return {
        label: 'Preempted',
        color: 'orange',
        status: 'warning',
        IconComponent: ExclamationTriangleIcon,
      };
    case KueueWorkloadStatus.Inadmissible:
      return {
        label: 'Inadmissible',
        color: 'orange',
        status: 'warning',
        IconComponent: ExclamationTriangleIcon,
      };
    case KueueWorkloadStatus.Running:
      return { label: 'Running', color: 'blue', IconComponent: InProgressIcon };
    case KueueWorkloadStatus.Admitted:
      return {
        label: 'Starting',
        color: 'blue',
        IconComponent: InProgressIcon,
        iconClassName: 'odh-u-spin',
      };
    case KueueWorkloadStatus.Succeeded:
      return {
        label: 'Complete',
        status: 'success',
        color: 'green',
        IconComponent: CheckCircleIcon,
      };
    default:
      return { label: status, color: 'grey', IconComponent: OutlinedClockIcon };
  }
};
