import {
  ArtifactStateKF,
  ExecutionStateKF,
  InputDefinitionParameterType,
  RuntimeStateKF,
} from '~/concepts/pipelines/kfTypes';
import { createNode } from '~/concepts/topology';
import { VolumeMount } from '~/types';

export type PipelineTaskParam = {
  label: string;
  type: InputDefinitionParameterType;
  value?: string;
};

export type PipelineTaskArtifact = {
  label: string;
  type: string;
};

export type PipelineTaskStep = {
  image: string;
  args?: string[];
  command?: string[];
  volume?: {
    mountPath: string;
  };
};

export type PipelineTaskInputOutput = {
  artifacts?: PipelineTaskArtifact[];
  params?: PipelineTaskParam[];
};

export type PipelineTaskRunStatus = {
  startTime: string;
  completeTime?: string;
  podName?: string;
  state?: RuntimeStateKF | ExecutionStateKF | ArtifactStateKF;
  taskId?: string;
};

export type PipelineTask = {
  type: 'artifact' | 'task' | 'groupTask';
  name: string;
  steps?: PipelineTaskStep[];
  inputs?: PipelineTaskInputOutput;
  outputs?: PipelineTaskInputOutput;
  /** Run Status */
  status?: PipelineTaskRunStatus;
  /** Volume Mounts */
  volumeMounts?: VolumeMount[];
};

export type KubeFlowTaskTopology = {
  /**
   * Details of a selected node.
   * [Task.name]: Task
   */
  taskMap: Record<string, PipelineTask | undefined>;
  /**
   * Nodes to render in topology.
   */
  nodes: ReturnType<typeof createNode>[];
};
