import { PipelineSpec, PipelineSpecVariable } from '#~/concepts/pipelines/kfTypes';

export const getCorePipelineSpec = (spec?: PipelineSpecVariable): PipelineSpec | undefined =>
  spec?.pipeline_spec ?? spec;
