import { PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { ArtifactProperty } from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/artifacts/types';

export type RunWithMetrics = PipelineRunKFv2 & { metrics: ArtifactProperty[] };
