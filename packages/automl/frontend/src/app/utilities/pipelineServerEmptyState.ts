import { getGenericErrorCode } from '@odh-dashboard/internal/api/errorUtils';

import { parseErrorStatus } from '~/app/utilities/utils';

/**
 * Empty State A: true when list load failed because there is no managed pipeline server and/or
 * no managed AutoML pipeline definitions (mapped BFF errors). Takes precedence over Empty State B
 * because callers branch on `loadError` before the zero-runs empty state.
 */
export function shouldShowConfigurePipelineServerEmptyState(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const status = getGenericErrorCode(error) ?? parseErrorStatus(error);
  if (status === 404) {
    return true;
  }
  const msg = error.message;
  if (/no\s+pipeline\s+server\s*\(\s*dspipelineapplication\)/i.test(msg)) {
    return true;
  }
  if (/\bno\s+automl\s+pipelines?\s+found\b/i.test(msg)) {
    return true;
  }
  if (/\bno\s+automl\s+.+\spipeline\s+found\b/i.test(msg)) {
    return true;
  }
  if (/\bfailed\s+to\s+discover\s+automl\s+pipelines\b/i.test(msg)) {
    return true;
  }
  // Require "(DSPA)" closed; exclude readiness wording so 503 → PipelineServerNotReady is not misrouted.
  if (/\bpipeline\s+server\s*\(\s*dspa\s*\)(?!\s*is\s+not)/i.test(msg)) {
    return true;
  }
  return false;
}
