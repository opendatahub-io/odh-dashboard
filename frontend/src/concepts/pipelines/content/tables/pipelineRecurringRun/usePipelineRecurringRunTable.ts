import usePipelineRecurringRuns from '#~/concepts/pipelines/apiHooks/usePipelineRecurringRuns';
import { useCreatePipelineRunTable } from '#~/concepts/pipelines/content/tables/usePipelineTable';
import { PipelineRecurringRunKF } from '#~/concepts/pipelines/kfTypes';
import { PipelineRunOptions } from '#~/concepts/pipelines/types';

export const usePipelineRecurringRunsTable = (
  options?: PipelineRunOptions,
  limit?: number,
): ReturnType<typeof useCreatePipelineRunTable<PipelineRecurringRunKF>> =>
  useCreatePipelineRunTable<PipelineRecurringRunKF>(usePipelineRecurringRuns, options, limit);
