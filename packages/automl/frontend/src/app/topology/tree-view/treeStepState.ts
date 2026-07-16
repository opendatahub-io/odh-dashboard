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
  if (typeof data !== 'object' || data === null || !Object.hasOwn(data, 'stepState')) {
    return false;
  }

  // Own-property access only — ignore inherited / prototype-polluted keys.
  const stepState: unknown = Reflect.get(data, 'stepState');
  if (!isTreeStepState(stepState)) {
    return false;
  }

  if (Object.hasOwn(data, 'label')) {
    const label: unknown = Reflect.get(data, 'label');
    if (label !== undefined && typeof label !== 'string') {
      return false;
    }
  }

  if (Object.hasOwn(data, 'activeIconVariant')) {
    const activeIconVariant: unknown = Reflect.get(data, 'activeIconVariant');
    if (!isActiveIconVariant(activeIconVariant)) {
      return false;
    }
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
