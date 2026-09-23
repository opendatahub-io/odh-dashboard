import { NodeStatus, RunStatus } from '@patternfly/react-topology';
import type { TreeNodeData } from './TreeNode';
import { isWinnerRank } from './treeNodeVisualState';

export type TreeStepState = TreeNodeData['stepState'];

/**
 * Maps pipeline step state to PatternFly topology NodeStatus.
 * Completed uses success (green) chrome; just-completed / winner override in TreeNode.
 */
export const treeStepStateToNodeStatus = (stepState: TreeStepState): NodeStatus => {
  switch (stepState) {
    case 'failed':
      return NodeStatus.danger;
    case 'active':
      return NodeStatus.info;
    case 'completed':
      return NodeStatus.success;
    case 'unreached':
    case 'pending':
    default:
      return NodeStatus.default;
  }
};

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

  if (
    'labelSubtitle' in data &&
    data.labelSubtitle !== undefined &&
    typeof data.labelSubtitle !== 'string'
  ) {
    return false;
  }

  if (
    'showWinnerStar' in data &&
    data.showWinnerStar !== undefined &&
    typeof data.showWinnerStar !== 'boolean'
  ) {
    return false;
  }

  if (
    'showModelsToggle' in data &&
    data.showModelsToggle !== undefined &&
    typeof data.showModelsToggle !== 'boolean'
  ) {
    return false;
  }

  if ('hideLabel' in data && data.hideLabel !== undefined && typeof data.hideLabel !== 'boolean') {
    return false;
  }

  if ('winnerRank' in data && data.winnerRank !== undefined && !isWinnerRank(data.winnerRank)) {
    return false;
  }

  if (
    'nodeRole' in data &&
    data.nodeRole !== undefined &&
    data.nodeRole !== 'task' &&
    data.nodeRole !== 'column-header' &&
    data.nodeRole !== 'column-rule' &&
    data.nodeRole !== 'row-label' &&
    data.nodeRole !== 'models-toggle'
  ) {
    return false;
  }

  if ('activeIconVariant' in data && !isActiveIconVariant(data.activeIconVariant)) {
    return false;
  }

  if (
    'columnRuleWidth' in data &&
    data.columnRuleWidth !== undefined &&
    typeof data.columnRuleWidth !== 'number'
  ) {
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
