import {
  usePipelineActiveRuns,
  usePipelineArchivedRuns,
} from '#~/concepts/pipelines/apiHooks/usePipelineRuns';
import { useCreatePipelineRunTable } from '#~/concepts/pipelines/content/tables/usePipelineTable';
import { PipelineRunKF } from '#~/concepts/pipelines/kfTypes';
import { PipelineRunOptions } from '#~/concepts/pipelines/types';

export const usePipelineActiveRunsTable = (
  options?: PipelineRunOptions,
  limit?: number,
): ReturnType<typeof useCreatePipelineRunTable<PipelineRunKF>> =>
  useCreatePipelineRunTable<PipelineRunKF>(usePipelineActiveRuns, options, limit);

export const usePipelineArchivedRunsTable = (
  options?: PipelineRunOptions,
  limit?: number,
): ReturnType<typeof useCreatePipelineRunTable<PipelineRunKF>> =>
  useCreatePipelineRunTable<PipelineRunKF>(usePipelineArchivedRuns, options, limit);
