export type EvaluationStatusMessage = {
  message?: string;
  message_code?: string;
  message_origin?: string;
};

const SAFE_MESSAGE_CODES = new Set([
  'evaluation_job_created',
  'evaluation_job_retrieved',
  'evaluation_job_cancelled',
  'evaluation_job_failed',
  'evaluation_job_updated',
  'gpu_unavailable',
  'evaluation_error',
]);

export const evaluationErrorCategory = (
  statusMessage?: EvaluationStatusMessage,
): string | undefined => {
  if (
    !statusMessage ||
    (!statusMessage.message && !statusMessage.message_code && !statusMessage.message_origin)
  ) {
    return undefined;
  }

  return statusMessage.message_code && SAFE_MESSAGE_CODES.has(statusMessage.message_code)
    ? statusMessage.message_code
    : 'unknown_error';
};
