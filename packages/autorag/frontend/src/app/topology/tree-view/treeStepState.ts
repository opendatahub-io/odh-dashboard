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

const ACTIVE_ICON_VARIANTS: readonly NonNullable<TreeNodeData['activeIconVariant']>[] = [
  'sync',
  'pulse',
];

const isActiveIconVariant = (value: unknown): value is TreeNodeData['activeIconVariant'] =>
  value === undefined || ACTIVE_ICON_VARIANTS.some((variant) => variant === value);

export const isTreeNodeData = (data: unknown): data is TreeNodeData => {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  if (!('stepState' in data) || !isTreeStepState(data.stepState)) {
    return false;
  }

  if ('label' in data && data.label !== undefined && typeof data.label !== 'string') {
    return false;
  }

  if ('activeIconVariant' in data && !isActiveIconVariant(data.activeIconVariant)) {
    return false;
  }

  return true;
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
