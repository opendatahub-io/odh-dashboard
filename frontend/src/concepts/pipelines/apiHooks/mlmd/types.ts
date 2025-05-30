import { Artifact, Context, ContextType, Event, Execution } from '#~/third_party/mlmd';
import { PipelineRunKF } from '#~/concepts/pipelines/kfTypes';

export type MlmdContext = Context;

export type MlmdContextType = ContextType;

export enum MlmdContextTypes {
  RUN = 'system.PipelineRun',
}

// each artifact is linked to an event
export type LinkedArtifact = {
  event: Event;
  artifact: Artifact;
};

// each execution can have multiple output artifacts
export type ExecutionArtifact = {
  execution: Execution;
  linkedArtifacts: LinkedArtifact[];
};

// each run has multiple executions, each execution can have multiple artifacts
export type RunArtifact = {
  run: PipelineRunKF;
  executionArtifacts: ExecutionArtifact[];
};
