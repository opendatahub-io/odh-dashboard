import usePipelineRunJobs from '~/concepts/pipelines/apiHooks/usePipelineRunJobs';
import { useCreatePipelineRunTable } from '~/concepts/pipelines/content/tables/usePipelineTable';
import { PipelineRunJobKFv2 } from '~/concepts/pipelines/kfTypes';
import { PipelineRunOptions } from '~/concepts/pipelines/types';

export const usePipelineScheduledRunsTable = (
  options?: PipelineRunOptions,
  limit?: number,
): ReturnType<typeof useCreatePipelineRunTable<PipelineRunJobKFv2>> =>
  useCreatePipelineRunTable<PipelineRunJobKFv2>(usePipelineRunJobs, options, limit);
