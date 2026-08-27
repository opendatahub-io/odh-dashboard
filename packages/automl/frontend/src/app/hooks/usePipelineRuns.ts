import {
  usePipelineRuns as useCorePipelineRuns,
  type PipelineRunsResult,
} from '@odh-dashboard/autox-core/ui/hooks';
import { POLL_INTERVAL } from '~/app/utilities/const';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';

export const usePipelineRuns = (namespace: string): PipelineRunsResult<ConfigureSchema> =>
  useCorePipelineRuns<ConfigureSchema>(namespace, POLL_INTERVAL);
