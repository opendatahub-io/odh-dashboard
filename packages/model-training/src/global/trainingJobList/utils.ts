import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  PendingIcon,
  PlayIcon,
  PauseIcon,
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
    default:
      return {
        label: 'Unknown',
        status: 'warning',
        IconComponent: ExclamationCircleIcon,
      };
  }
};

export const getJobStatusFromPyTorchJob = (job: PyTorchJobKind): PyTorchJobState => {
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

export const getJobStatusWithHibernation = async (
  job: PyTorchJobKind,
): Promise<PyTorchJobState> => {
  const standardStatus = getJobStatusFromPyTorchJob(job);

  // If the job is in a terminal state (succeeded or failed), don't check hibernation
  // Terminal states take precedence over hibernation status
  if (standardStatus === PyTorchJobState.SUCCEEDED || standardStatus === PyTorchJobState.FAILED) {
    return standardStatus;
  }

  try {
    const workload = await getWorkloadForPyTorchJob(job);
    if (workload && workload.spec.active === false) {
      return PyTorchJobState.PAUSED;
    }
  } catch (error) {
    console.warn('Failed to check hibernation status for PyTorchJob:', error);
  }

  return standardStatus;
};
