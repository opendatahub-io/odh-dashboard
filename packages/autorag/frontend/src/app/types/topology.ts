/**
 * Topology types for the AutoRAG pipeline graph.
 * Duplicated from frontend/src/concepts/topology/types.ts
 * and frontend/src/concepts/pipelines/topology/pipelineTaskTypes.ts
 */
import { PipelineNodeModel, RunStatus, WhenStatus } from '@patternfly/react-topology';
import { ExecutionStateKF, RuntimeStateKF } from './pipeline';

export type PipelineTaskRunStatus = {
  startTime: string;
  completeTime?: string;
  podName?: string;
  state?: RuntimeStateKF | ExecutionStateKF;
  taskId?: string;
};

export type PipelineTaskStep = {
  image: string;
  args?: string[];
  command?: string[];
};

export type PipelineTaskInputOutput = {
  params?: { label: string; type?: string; value?: string }[];
};

export type PipelineTask = {
  type: 'task' | 'groupTask';
  name: string;
  steps?: PipelineTaskStep[];
  inputs?: PipelineTaskInputOutput;
  outputs?: PipelineTaskInputOutput;
  status?: PipelineTaskRunStatus;
  whenStatus?: WhenStatus;
};

export type StandardTaskNodeData = {
  pipelineTask: PipelineTask;
  runStatus?: RunStatus;
};

export type PipelineNodeModelExpanded = PipelineNodeModel & {
  data?: StandardTaskNodeData;
};
