import usePipelineRecurringRuns from '~/concepts/pipelines/apiHooks/usePipelineRecurringRuns';
import { useCreatePipelineRunTable } from '~/concepts/pipelines/content/tables/usePipelineTable';
import { PipelineRecurringRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { PipelineRunOptions } from '~/concepts/pipelines/types';

export const usePipelineRecurringRunsTable = (
  options?: PipelineRunOptions,
  limit?: number,
): ReturnType<typeof useCreatePipelineRunTable<PipelineRecurringRunKFv2>> =>
  useCreatePipelineRunTable<PipelineRecurringRunKFv2>(usePipelineRecurringRuns, options, limit);
