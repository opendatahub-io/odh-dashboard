import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  PendingIcon,
  PlayIcon,
  PauseIcon,
  ExclamationTriangleIcon,
  ClockIcon,
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
    case PyTorchJobState.PENDING:
      return {
        label: 'Pending',
        color: 'teal',
        IconComponent: PendingIcon,
      };
    case PyTorchJobState.QUEUED:
      return {
        label: 'Queued',
        color: 'grey',
        IconComponent: ClockIcon,
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
        IconComponent: PauseIcon,
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
        color: 'orangered',
        IconComponent: ExclamationTriangleIcon,
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
    enableCaching?: boolean;
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

    // Check workload status for queuing, hibernation and preemption
    const workload = await getWorkloadForPyTorchJob(job);

    if (workload) {
      // Check for queued status: workload conditions indicate waiting for resources
      const conditions = workload.status?.conditions || [];
      const quotaReservedCondition = conditions.find((c) => c.type === 'QuotaReserved');
      const podsReadyCondition = conditions.find((c) => c.type === 'PodsReady');

      const isWaitingForQuota =
        quotaReservedCondition &&
        quotaReservedCondition.status === 'False' &&
        quotaReservedCondition.reason === 'Pending';
      const isWaitingForPods =
        podsReadyCondition &&
        podsReadyCondition.status === 'False' &&
        podsReadyCondition.reason === 'WaitForStart';

      if (isWaitingForQuota && isWaitingForPods) {
        return { status: PyTorchJobState.QUEUED, isLoading: false };
      }

      // Check for preempted status: workload.spec.active = true AND job.spec.runPolicy.suspend = false
      const isWorkloadActive = workload.spec.active === true;
      // Check if runPolicy exists and suspend is set to false
      const isJobNotSuspended = job.spec.runPolicy?.suspend === false;

      if (isWorkloadActive && isJobNotSuspended) {
        return { status: PyTorchJobState.PREEMPTED, isLoading: false };
      }

      // Check for paused/hibernated status: workload.spec.active = false
      if (workload.spec.active === false) {
        return { status: PyTorchJobState.PAUSED, isLoading: false };
      }
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
 * This version only returns the basic PyTorch job status without hibernation check
 * @param job - PyTorch job to check status for
 * @returns Basic job status
 */
export const getTrainingJobStatusSync = (job: PyTorchJobKind): PyTorchJobState => {
  return getBasicJobStatus(job);
};
