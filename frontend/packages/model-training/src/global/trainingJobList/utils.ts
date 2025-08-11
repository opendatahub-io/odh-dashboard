import { PyTorchJobKind } from '../../k8sTypes';
import { PyTorchJobState } from '../../types';

export const getJobStatus = (job: PyTorchJobKind): PyTorchJobState => {
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

  // Map the current condition type to our state enum
  switch (currentCondition.type) {
    case 'Succeeded':
      return PyTorchJobState.SUCCEEDED;
    case 'Failed':
      return PyTorchJobState.FAILED;
    case 'Running':
      return PyTorchJobState.RUNNING;
    case 'Suspended':
      return PyTorchJobState.PENDING; // Suspended jobs are pending resume
    case 'Created':
      return PyTorchJobState.CREATED; // Job resource created
    default:
      return PyTorchJobState.UNKNOWN;
  }
};
