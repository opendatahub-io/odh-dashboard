import {
  usePipelineActiveRuns,
  usePipelineArchivedRuns,
} from '~/concepts/pipelines/apiHooks/usePipelineRuns';
import { useCreatePipelineRunTable } from '~/concepts/pipelines/content/tables/usePipelineTable';
import { PipelineRunOptions } from '~/concepts/pipelines/types';

export const usePipelineActiveRunsTable = (
  options?: PipelineRunOptions,
  limit?: number,
): ReturnType<typeof useCreatePipelineRunTable> =>
  useCreatePipelineRunTable(usePipelineActiveRuns, options, limit);

export const usePipelineArchivedRunsTable = (
  options?: PipelineRunOptions,
  limit?: number,
): ReturnType<typeof useCreatePipelineRunTable> =>
  useCreatePipelineRunTable(usePipelineArchivedRuns, options, limit);
