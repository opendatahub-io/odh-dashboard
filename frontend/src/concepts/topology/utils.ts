import { DEFAULT_TASK_NODE_TYPE, RunStatus } from '@patternfly/react-topology';
import { PipelineTask } from '#~/concepts/pipelines/topology';
import { ExecutionStateKF } from '#~/concepts/pipelines/kfTypes';
import { EXECUTION_TASK_NODE_TYPE, NODE_HEIGHT, NODE_WIDTH } from './const';
import { PipelineNodeModelExpanded } from './types';

export const ICON_TASK_NODE_TYPE = 'ICON_TASK_NODE';

/** Human-readable label for a PF topology RunStatus value. */
export const getRunStatusLabel = (status: RunStatus | string | undefined): string => {
  switch (status) {
    case RunStatus.Succeeded:
      return 'Complete';
    case RunStatus.Failed:
    case RunStatus.FailedToStart:
      return 'Failed';
    case RunStatus.Cancelled:
      return 'Canceled';
    case RunStatus.Running:
    case RunStatus.InProgress:
      return 'Running';
    case RunStatus.Pending:
    case RunStatus.Idle:
      return 'Pending';
    case RunStatus.Skipped:
      return 'Skipped';
    default:
      return '';
  }
};

/**
 * Human-readable label for a KF ExecutionStateKF value.
 * Returns undefined when the state does not override the RunStatus label.
 */
export const getExecutionStateLabel = (
  state: ExecutionStateKF | string | undefined,
): string | undefined => {
  switch (state) {
    case ExecutionStateKF.CACHED:
      return 'Cached';
    case ExecutionStateKF.CANCELING:
      return 'Canceling';
    case ExecutionStateKF.CANCELED:
      return 'Canceled';
    case ExecutionStateKF.SKIPPED:
      return 'Skipped';
    case ExecutionStateKF.PENDING:
      return 'Pending';
    case ExecutionStateKF.RUNNING:
      return 'Running';
    case ExecutionStateKF.COMPLETE:
      return 'Complete';
    case ExecutionStateKF.FAILED:
      return 'Failed';
    default:
      return undefined;
  }
};

export const ARTIFACT_NODE_WIDTH = 44;
export const ARTIFACT_NODE_HEIGHT = NODE_HEIGHT;

export const NODE_PADDING_VERTICAL = 40;
export const NODE_PADDING_HORIZONTAL = 15;

export const createNode = (
  id: string,
  label: string,
  pipelineTask: PipelineTask,
  runAfterTasks?: string[],
  runStatus?: RunStatus,
): PipelineNodeModelExpanded => ({
  id,
  label,
  type: DEFAULT_TASK_NODE_TYPE,
  width: NODE_WIDTH,
  height: NODE_HEIGHT,
  runAfterTasks,
  data: {
    pipelineTask,
    runStatus,
  },
});

export const createArtifactNode = (
  id: string,
  label: string,
  pipelineTask: PipelineTask,
  artifactType: string,
  runAfterTasks?: string[],
): PipelineNodeModelExpanded => ({
  id,
  label: `${label} (Type: ${artifactType.slice(7)})`,
  type: ICON_TASK_NODE_TYPE,
  width: ARTIFACT_NODE_WIDTH,
  height: ARTIFACT_NODE_HEIGHT,
  runAfterTasks,
  data: {
    pipelineTask,
    artifactType,
    runStatus: pipelineTask.metadata ? RunStatus.Succeeded : undefined,
  },
});

export const createGroupNode = (
  id: string,
  label: string,
  pipelineTask: PipelineTask,
  runAfterTasks?: string[],
  runStatus?: RunStatus,
  children?: string[],
): PipelineNodeModelExpanded => ({
  id,
  label,
  type: EXECUTION_TASK_NODE_TYPE,
  group: true,
  collapsed: true,
  width: NODE_WIDTH,
  height: NODE_HEIGHT,
  runAfterTasks,
  children,
  style: {
    padding: [NODE_PADDING_VERTICAL + 24, NODE_PADDING_HORIZONTAL],
  },
  data: {
    pipelineTask,
    runStatus,
  },
});
