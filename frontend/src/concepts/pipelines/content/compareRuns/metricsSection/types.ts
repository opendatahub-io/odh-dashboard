// An artifact which has associated event.

import { LinkedArtifact } from '#~/concepts/pipelines/apiHooks/mlmd/types';
import { PipelineRunKF } from '#~/concepts/pipelines/kfTypes';
import { Artifact, Event, Execution } from '#~/third_party/mlmd';

// each run can have multiple executions, artifacts, and events
export type PipelineRunRelatedMlmd = {
  run: PipelineRunKF;
  executions: Execution[];
  artifacts: Artifact[];
  events: Event[];
};

export type FullArtifactPath = {
  linkedArtifact: LinkedArtifact;
  run: PipelineRunKF;
  execution: Execution;
};
