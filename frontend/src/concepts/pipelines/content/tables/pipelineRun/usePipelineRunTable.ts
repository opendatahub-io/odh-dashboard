import {
  usePipelineActiveRuns,
  usePipelineArchivedRuns,
} from '~/concepts/pipelines/apiHooks/usePipelineRuns';
import { useCreatePipelineRunTable } from '~/concepts/pipelines/content/tables/usePipelineTable';
import { PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { PipelineRunOptions } from '~/concepts/pipelines/types';

export const usePipelineActiveRunsTable = (
  options?: PipelineRunOptions,
  limit?: number,
): ReturnType<typeof useCreatePipelineRunTable<PipelineRunKFv2>> =>
  useCreatePipelineRunTable<PipelineRunKFv2>(usePipelineActiveRuns, options, limit);

export const usePipelineArchivedRunsTable = (
  options?: PipelineRunOptions,
  limit?: number,
): ReturnType<typeof useCreatePipelineRunTable<PipelineRunKFv2>> =>
  useCreatePipelineRunTable<PipelineRunKFv2>(usePipelineArchivedRuns, options, limit);
