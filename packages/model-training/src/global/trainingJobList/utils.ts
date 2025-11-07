import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  PendingIcon,
  PlayIcon,
  PauseIcon,
  OutlinedClockIcon,
  PauseCircleIcon,
} from '@patternfly/react-icons';
import { LabelProps } from '@patternfly/react-core';
import { TrainJobKind } from '../../k8sTypes';
import { TrainingJobState } from '../../types';
import { getWorkloadForTrainJob } from '../../api';

export const getStatusInfo = (
  status: TrainingJobState,
): {
  label: string;
  status?: LabelProps['status'];
  color?: LabelProps['color'];
  IconComponent: React.ComponentType;
} => {
  switch (status) {
    case TrainingJobState.SUCCEEDED:
      return {
        label: 'Succeeded',
        color: 'green',
        IconComponent: CheckCircleIcon,
      };
    case TrainingJobState.FAILED:
      return {
        label: 'Failed',
        color: 'red',
        IconComponent: ExclamationCircleIcon,
      };
    case TrainingJobState.RUNNING:
      return {
        label: 'Running',
        color: 'blue',
        IconComponent: InProgressIcon,
      };
    case TrainingJobState.RESTARTING:
      return {
        label: 'Restarting',
        color: 'blue',
        IconComponent: InProgressIcon,
      };
    case TrainingJobState.PENDING:
      return {
        label: 'Pending',
        color: 'teal',
        IconComponent: PendingIcon,
      };
    case TrainingJobState.QUEUED:
      return {
        label: 'Queued',
        color: 'teal',
        IconComponent: OutlinedClockIcon,
      };
    case TrainingJobState.CREATED:
      return {
        label: 'Created',
        color: 'grey',
        IconComponent: PlayIcon,
      };
    case TrainingJobState.PAUSED:
      return {
        label: 'Paused',
        color: 'grey',
        IconComponent: PauseCircleIcon,
      };
    case TrainingJobState.SUSPENDED:
      return {
        label: 'Suspended',
        color: 'grey',
        IconComponent: PauseIcon,
      };
    case TrainingJobState.PREEMPTED:
      return {
        label: 'Preempted',
        color: 'grey',
        IconComponent: PendingIcon,
      };
    default:
      return {
        label: 'Unknown',
        status: 'warning',
        IconComponent: ExclamationCircleIcon,
      };
  }
};

/**
 * Get basic TrainJob status from conditions (synchronous)
 * This is the core status extraction function used internally
 */
const getBasicJobStatus = (job: TrainJobKind): TrainingJobState => {
  if (!job.status?.conditions) {
    return TrainingJobState.UNKNOWN;
  }

  // Sort conditions by lastTransitionTime (most recent first)
  const sortedConditions = job.status.conditions.toSorted((a, b) =>
    (b.lastTransitionTime || '').localeCompare(a.lastTransitionTime || ''),
  );

  // Find the most recent condition with status='True' (current active state)
  const currentCondition = sortedConditions.find((condition) => condition.status === 'True');

  if (!currentCondition) {
    return TrainingJobState.UNKNOWN;
  }

  switch (currentCondition.type) {
    case 'Succeeded':
      return TrainingJobState.SUCCEEDED;
    case 'Failed':
      return TrainingJobState.FAILED;
    case 'Running':
      return TrainingJobState.RUNNING;
    case 'Created':
      return TrainingJobState.CREATED;
    case 'Restarting':
      return TrainingJobState.RESTARTING;
    default:
      return TrainingJobState.UNKNOWN;
  }
};

/**
 * Unified function to get training job status with hibernation support (async)
 * @param job - TrainJob to check status for
 * @param options - Configuration options
 * @returns Promise resolving to the job's current status
 */
export const getTrainingJobStatus = async (
  job: TrainJobKind,
  options: {
    skipHibernationCheck?: boolean;
  } = {},
): Promise<{ status: TrainingJobState; isLoading: boolean; error?: string }> => {
  const { skipHibernationCheck = false } = options;

  try {
    // Get basic status from TrainJob conditions
    const basicStatus = getBasicJobStatus(job);

    // Skip hibernation check if disabled or job is in terminal state
    if (
      skipHibernationCheck ||
      basicStatus === TrainingJobState.SUCCEEDED ||
      basicStatus === TrainingJobState.FAILED
    ) {
      return { status: basicStatus, isLoading: false };
    }

    // Check workload status for Kueue-enabled jobs and spec.suspend for non-Kueue jobs
    const workload = await getWorkloadForTrainJob(job);

    if (workload) {
      // Kueue-enabled job: Check workload status for queuing, hibernation and preemption

      // Priority 1: Check for paused/hibernated status - workload.spec.active = false
      if (workload.spec.active === false) {
        return { status: TrainingJobState.PAUSED, isLoading: false };
      }

      // Use correct priority order for workload status determination
      const conditions = workload.status?.conditions || [];

      // Priority 2: Check for preempted status - Evicted or Preempted conditions with status=True
      const evictedCondition = conditions.find((c) => c.type === 'Evicted' && c.status === 'True');
      const preemptedCondition = conditions.find(
        (c) => c.type === 'Preempted' && c.status === 'True',
      );

      if (evictedCondition || preemptedCondition) {
        return { status: TrainingJobState.PREEMPTED, isLoading: false };
      }

      // Priority 3: Check for running status - PodsReady condition with status=True
      const podsReadyCondition = conditions.find(
        (c) => c.type === 'PodsReady' && c.status === 'True',
      );

      if (podsReadyCondition) {
        return { status: TrainingJobState.RUNNING, isLoading: false };
      }

      // Priority 4: Check for queued status - Everything else is queued
      // Also check if the workload conditions list contains type "Admitted"
      // (if it doesn't, it means it was never in a running state)
      return { status: TrainingJobState.QUEUED, isLoading: false };
    }
    // Non-Kueue job: Check TrainJob spec.suspend for hibernation
    const isSuspended = job.spec.suspend === true;

    if (isSuspended) {
      return { status: TrainingJobState.PAUSED, isLoading: false };
    }

    // Return basic status if no special conditions are met
    return { status: basicStatus, isLoading: false };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`Failed to get status for TrainJob ${job.metadata.name}:`, errorMessage);

    // Fallback to basic status on error
    return {
      status: getBasicJobStatus(job),
      isLoading: false,
      error: errorMessage,
    };
  }
};

/**
 * Get training job status (synchronous version for sorting/filtering)
 * This version checks basic TrainJob status and spec.suspend for non-Kueue jobs
 * @param job - TrainJob to check status for
 * @returns Job status including basic hibernation check
 */
export const getTrainingJobStatusSync = (job: TrainJobKind): TrainingJobState => {
  const basicStatus = getBasicJobStatus(job);

  // Skip hibernation check for terminal states
  if (basicStatus === TrainingJobState.SUCCEEDED || basicStatus === TrainingJobState.FAILED) {
    return basicStatus;
  }

  // Check for non-Kueue job suspension via spec.suspend
  const isSuspended = job.spec.suspend === true;
  if (isSuspended) {
    return TrainingJobState.PAUSED;
  }

  return basicStatus;
};
