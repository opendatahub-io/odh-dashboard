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
import { PyTorchJobKind } from '../../k8sTypes';
import { PyTorchJobState } from '../../types';
import { getWorkloadForPyTorchJob } from '../../api';

export const getStatusInfo = (
  status: PyTorchJobState,
): {
  label: string;
  status?: LabelProps['status'];
  color?: LabelProps['color'];
  IconComponent: React.ComponentType;
} => {
  switch (status) {
    case PyTorchJobState.SUCCEEDED:
      return {
        label: 'Succeeded',
        color: 'green',
        IconComponent: CheckCircleIcon,
      };
    case PyTorchJobState.FAILED:
      return {
        label: 'Failed',
        color: 'red',
        IconComponent: ExclamationCircleIcon,
      };
    case PyTorchJobState.RUNNING:
      return {
        label: 'Running',
        color: 'blue',
        IconComponent: InProgressIcon,
      };
    case PyTorchJobState.RESTARTING:
      return {
        label: 'Restarting',
        color: 'blue',
        IconComponent: InProgressIcon,
      };
    case PyTorchJobState.PENDING:
      return {
        label: 'Pending',
        color: 'teal',
        IconComponent: PendingIcon,
      };
    case PyTorchJobState.QUEUED:
      return {
        label: 'Queued',
        color: 'teal',
        IconComponent: OutlinedClockIcon,
      };
    case PyTorchJobState.CREATED:
      return {
        label: 'Created',
        color: 'grey',
        IconComponent: PlayIcon,
      };
    case PyTorchJobState.PAUSED:
      return {
        label: 'Paused',
        color: 'grey',
        IconComponent: PauseCircleIcon,
      };
    case PyTorchJobState.SUSPENDED:
      return {
        label: 'Suspended',
        color: 'grey',
        IconComponent: PauseIcon,
      };
    case PyTorchJobState.PREEMPTED:
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
 * Get basic PyTorch job status from conditions (synchronous)
 * This is the core status extraction function used internally
 */
const getBasicJobStatus = (job: PyTorchJobKind): PyTorchJobState => {
  if (!job.status?.conditions) {
    return PyTorchJobState.UNKNOWN;
  }

  // Sort conditions by lastTransitionTime (most recent first)
  const sortedConditions = job.status.conditions.toSorted((a, b) =>
    (b.lastTransitionTime || '').localeCompare(a.lastTransitionTime || ''),
  );

  // Find the most recent condition with status='True' (current active state)
  const currentCondition = sortedConditions.find((condition) => condition.status === 'True');

  if (!currentCondition) {
    return PyTorchJobState.UNKNOWN;
  }

  switch (currentCondition.type) {
    case 'Succeeded':
      return PyTorchJobState.SUCCEEDED;
    case 'Failed':
      return PyTorchJobState.FAILED;
    case 'Running':
      return PyTorchJobState.RUNNING;
    case 'Created':
      return PyTorchJobState.CREATED;
    case 'Restarting':
      return PyTorchJobState.RESTARTING;
    default:
      return PyTorchJobState.UNKNOWN;
  }
};

/**
 * Unified function to get training job status with hibernation support (async)
 * @param job - PyTorch job to check status for
 * @param options - Configuration options
 * @returns Promise resolving to the job's current status
 */
export const getTrainingJobStatus = async (
  job: PyTorchJobKind,
  options: {
    skipHibernationCheck?: boolean;
  } = {},
): Promise<{ status: PyTorchJobState; isLoading: boolean; error?: string }> => {
  const { skipHibernationCheck = false } = options;

  try {
    // Get basic status from PyTorch job conditions
    const basicStatus = getBasicJobStatus(job);

    // Skip hibernation check if disabled or job is in terminal state
    if (
      skipHibernationCheck ||
      basicStatus === PyTorchJobState.SUCCEEDED ||
      basicStatus === PyTorchJobState.FAILED
    ) {
      return { status: basicStatus, isLoading: false };
    }

    // Check workload status for Kueue-enabled jobs and runPolicy for non-Kueue jobs
    const workload = await getWorkloadForPyTorchJob(job);

    if (workload) {
      // Kueue-enabled job: Check workload status for queuing, hibernation and preemption

      // Priority 1: Check for paused/hibernated status - workload.spec.active = false
      if (workload.spec.active === false) {
        return { status: PyTorchJobState.PAUSED, isLoading: false };
      }

      // Use correct priority order for workload status determination
      const conditions = workload.status?.conditions || [];

      // Priority 2: Check for preempted status - Evicted or Preempted conditions with status=True
      const evictedCondition = conditions.find((c) => c.type === 'Evicted' && c.status === 'True');
      const preemptedCondition = conditions.find(
        (c) => c.type === 'Preempted' && c.status === 'True',
      );

      if (evictedCondition || preemptedCondition) {
        return { status: PyTorchJobState.PREEMPTED, isLoading: false };
      }

      // Priority 3: Check for running status - PodsReady condition with status=True
      const podsReadyCondition = conditions.find(
        (c) => c.type === 'PodsReady' && c.status === 'True',
      );

      if (podsReadyCondition) {
        return { status: PyTorchJobState.RUNNING, isLoading: false };
      }

      // Priority 4: Check for queued status - Everything else is queued
      // Also check if the workload conditions list contains type "Admitted"
      // (if it doesn't, it means it was never in a running state)
      return { status: PyTorchJobState.QUEUED, isLoading: false };
    }
    // Non-Kueue job: Check PyTorchJob runPolicy.suspend for hibernation
    const isSuspendedByRunPolicy = job.spec.runPolicy?.suspend === true;

    if (isSuspendedByRunPolicy) {
      return { status: PyTorchJobState.PAUSED, isLoading: false };
    }

    // Return basic status if no special conditions are met
    return { status: basicStatus, isLoading: false };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`Failed to get status for PyTorchJob ${job.metadata.name}:`, errorMessage);

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
 * This version checks basic PyTorch job status and runPolicy.suspend for non-Kueue jobs
 * @param job - PyTorch job to check status for
 * @returns Job status including basic hibernation check
 */
export const getTrainingJobStatusSync = (job: PyTorchJobKind): PyTorchJobState => {
  const basicStatus = getBasicJobStatus(job);

  // Skip hibernation check for terminal states
  if (basicStatus === PyTorchJobState.SUCCEEDED || basicStatus === PyTorchJobState.FAILED) {
    return basicStatus;
  }

  // Check for non-Kueue job suspension via runPolicy.suspend
  const isSuspendedByRunPolicy = job.spec.runPolicy?.suspend === true;
  if (isSuspendedByRunPolicy) {
    return PyTorchJobState.PAUSED;
  }

  return basicStatus;
};
