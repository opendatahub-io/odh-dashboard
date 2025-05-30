import { WhenStatus } from '@patternfly/react-topology';
import {
  ArtifactStateKF,
  ExecutionStateKF,
  InputDefinitionParameterType,
  RuntimeStateKF,
} from '#~/concepts/pipelines/kfTypes';
import { Artifact } from '#~/third_party/mlmd';
import { VolumeMount } from '#~/types';

export type PipelineTaskParam = {
  label: string;
  type: InputDefinitionParameterType;
  value?: string;
};

export type PipelineTaskArtifact = {
  label: string;
  type: string;
  value?: Artifact;
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
  metadata?: Artifact | undefined;
  /** Run Status */
  status?: PipelineTaskRunStatus;
  /** Volume Mounts */
  volumeMounts?: VolumeMount[];
  whenStatus?: WhenStatus;
};
