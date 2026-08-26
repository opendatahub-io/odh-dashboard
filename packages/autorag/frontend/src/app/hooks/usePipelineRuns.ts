import { createUsePipelineRuns } from '@odh-dashboard/autox-core/ui/hooks';
import { getPipelineRunsFromBFF } from '~/app/api/pipelines';
import { POLL_INTERVAL } from '~/app/utilities/const';

export const usePipelineRuns = createUsePipelineRuns(
  getPipelineRunsFromBFF,
  undefined,
  POLL_INTERVAL,
);
