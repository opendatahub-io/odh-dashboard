import { PipelineRunKF } from '#~/concepts/pipelines/kfTypes';
import { ArtifactProperty } from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/artifacts/types';

export type RunWithMetrics = PipelineRunKF & { metrics: ArtifactProperty[] };
