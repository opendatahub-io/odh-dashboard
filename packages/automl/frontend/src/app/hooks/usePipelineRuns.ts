import {
  usePipelineRuns as useCorePipelineRuns,
  type PipelineRunsResult,
} from '@odh-dashboard/autox-core/ui/hooks';
import { DEFAULT_PAGE_SIZE, POLL_INTERVAL } from '~/app/utilities/const';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';

export const usePipelineRuns = (namespace: string): PipelineRunsResult<ConfigureSchema> =>
  useCorePipelineRuns<ConfigureSchema>(namespace, DEFAULT_PAGE_SIZE, POLL_INTERVAL);
