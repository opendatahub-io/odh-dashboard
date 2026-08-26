import { createUsePipelineRuns } from '@odh-dashboard/autox-core/ui/hooks';
import { getPipelineRunsFromBFF } from '~/app/api/pipelines';
import { DEFAULT_PAGE_SIZE, POLL_INTERVAL } from '~/app/utilities/const';

export const usePipelineRuns = createUsePipelineRuns(
  getPipelineRunsFromBFF,
  DEFAULT_PAGE_SIZE,
  POLL_INTERVAL,
);
