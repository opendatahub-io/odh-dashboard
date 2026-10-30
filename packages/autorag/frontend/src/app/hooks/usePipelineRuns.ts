import {
  usePipelineRuns as useCorePipelineRuns,
  type PipelineRunsResult,
} from '@odh-dashboard/autox-core/ui/hooks';
import { POLL_INTERVAL } from '~/app/utilities/const';

export const usePipelineRuns = (namespace: string): PipelineRunsResult =>
  useCorePipelineRuns(namespace, POLL_INTERVAL);
