import { getGenericErrorCode } from '@odh-dashboard/internal/api/errorUtils';

import { parseErrorStatus } from '~/app/utilities/utils';

/**
 * Empty State A: true when list load failed because there is no managed pipeline server
 * (mapped BFF errors). Takes precedence over Empty State B because callers branch on
 * `loadError` before the zero-runs empty state.
 *
 * Note: "no pipelines found" errors are no longer matched here — the BFF auto-creates
 * pipelines on experiment submission, so missing pipelines are not a user-facing error.
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
  // Require "(DSPA)" closed; exclude readiness wording so PipelineServerNotReady is not misrouted.
  if (/\bpipeline\s+server\s*\(\s*dspa\s*\)(?!.*\bis\s+not\s+ready)/i.test(msg)) {
    return true;
  }
  return false;
}

/**
 * True when the pipeline server exists but is not fully ready.
 * Matches the BFF middleware's 503 response message, which handleRestFailures
 * (mod-arch-core) flattens to a plain Error — stripping the HTTP status code.
 */
export function shouldShowPipelineServerNotReady(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const status = getGenericErrorCode(error) ?? parseErrorStatus(error);
  if (status === 503) {
    return true;
  }
  if (/\bpipeline\s+server\s+exists\s+but\s+is\s+not\s+ready\b/i.test(error.message)) {
    return true;
  }
  return false;
}
