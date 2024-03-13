import {
  usePipelineActiveRuns,
  usePipelineArchivedRuns,
} from '~/concepts/pipelines/apiHooks/usePipelineRuns';
import createUsePipelineTable from '~/concepts/pipelines/content/tables/usePipelineTable';

export const usePipelineActiveRunsTable = createUsePipelineTable(usePipelineActiveRuns);
export const usePipelineArchivedRunsTable = createUsePipelineTable(usePipelineArchivedRuns);
