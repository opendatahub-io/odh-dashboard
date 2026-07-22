import { WhenStatus } from '@patternfly/react-topology';
import type { VolumeMount } from '@odh-dashboard/k8s-core';
import {
  ArtifactStateKF,
  ExecutionStateKF,
  InputDefinitionParameterType,
  RuntimeStateKF,
} from '#~/concepts/pipelines/kfTypes';
import { Artifact } from '#~/third_party/mlmd';

export type ParallelForDisplayMode = 'inline' | 'layer';

export type PipelineTopologyLayerType = 'root' | 'subDag' | 'parallelForIterations' | 'iteration';

export type PipelineTopologyLayer = {
  label: string;
  type: PipelineTopologyLayerType;
  /** Which component's DAG to render (for subDag/parallelForIterations/iteration) */
  componentRef?: string;
  /** Number of ParallelFor iterations (for parallelForIterations layer) */
  iterationCount?: number;
  /** Iteration index (for iteration layer) */
  iterationIndex?: number;
  /** MLMD execution ID used to scope child execution matching */
  parentDagId?: number;
};

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
  /** True when this node represents a sub-DAG (static or ParallelFor) that can be drilled into */
  isSubDag?: boolean;
  /** Number of ParallelFor iterations — present only on the ParallelFor group node */
  iterationCount?: number;
  /** MLMD execution ID of the iteration DAG — used to scope drawer executions in inline mode */
  iterationParentDagId?: number;
};
