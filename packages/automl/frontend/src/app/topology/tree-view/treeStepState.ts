import { RunStatus } from '@patternfly/react-topology';
import type { TreeNodeData } from './TreeNode';

export type TreeStepState = TreeNodeData['stepState'];

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
    case RunStatus.Pending:
    default:
      return 'pending';
  }
};
