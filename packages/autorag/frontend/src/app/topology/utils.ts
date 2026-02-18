import { DEFAULT_TASK_NODE_TYPE, RunStatus } from '@patternfly/react-topology';
import { PipelineTask, PipelineNodeModelExpanded } from '~/app/types/topology';
import { EXECUTION_TASK_NODE_TYPE, NODE_HEIGHT, NODE_WIDTH } from './const';

const NODE_PADDING_VERTICAL = 40;
const NODE_PADDING_HORIZONTAL = 15;

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
