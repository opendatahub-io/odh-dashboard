import { getGenericErrorCode } from '@odh-dashboard/internal/api/errorUtils';

import { parseErrorStatus } from '~/app/utilities/utils';

/**
 * True when the error indicates no DSPipelineApplication CR exists in the namespace.
 */
export function shouldShowNoDSPAEmptyState(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const msg = error.message;
  if (/no\s+pipeline\s+server\s*\(\s*dspipelineapplication\)/i.test(msg)) {
    return true;
  }
  if (/\bpipeline\s+server\s*\(\s*dspa\s*\)(?!.*\bis\s+not\s+ready)/i.test(msg)) {
    return true;
  }
  return false;
}

/**
 * True when a pipeline server exists but the required managed pipelines are not found.
 */
export function shouldShowManagedPipelinesMissing(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return /required\s+managed\s+pipelines\s+not\s+found/i.test(error.message);
}

/**
 * Union of both states — true when either no DSPA or managed pipelines are missing.
 */
export function shouldShowConfigurePipelineServerEmptyState(error: unknown): boolean {
  return shouldShowNoDSPAEmptyState(error) || shouldShowManagedPipelinesMissing(error);
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
