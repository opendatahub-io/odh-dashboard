import { DEFAULT_TASK_NODE_TYPE, RunStatus } from '@patternfly/react-topology';
import { PipelineTask } from '#~/concepts/pipelines/topology';
import { EXECUTION_TASK_NODE_TYPE, NODE_HEIGHT, NODE_WIDTH } from './const';
import { PipelineNodeModelExpanded } from './types';

export const ICON_TASK_NODE_TYPE = 'ICON_TASK_NODE';

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
