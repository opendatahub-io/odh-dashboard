import { RunStatus } from '@patternfly/react-topology';
import type { TreeNodeData } from './TreeNode';

export type TreeStepState = TreeNodeData['stepState'];

const TREE_STEP_STATES: readonly TreeStepState[] = [
  'completed',
  'active',
  'pending',
  'failed',
  'unreached',
];

export const isTreeStepState = (value: unknown): value is TreeStepState =>
  typeof value === 'string' && TREE_STEP_STATES.some((state) => state === value);

export const isTreeNodeData = (data: unknown): data is TreeNodeData => {
  if (typeof data !== 'object' || data === null || !('stepState' in data)) {
    return false;
  }
  return isTreeStepState(data.stepState);
};

export const runStatusToTreeStepState = (status?: RunStatus): TreeStepState => {
  switch (status) {
    case RunStatus.Succeeded:
      return 'completed';
    case RunStatus.InProgress:
      return 'active';
    case RunStatus.Failed:
    case RunStatus.Cancelled:
      return 'failed';
    case RunStatus.Skipped:
      return 'unreached';
    case RunStatus.Pending:
    default:
      return 'pending';
  }
};
