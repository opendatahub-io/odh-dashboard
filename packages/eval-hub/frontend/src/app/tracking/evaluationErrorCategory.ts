type EvaluationStatusMessage = {
  message?: string;
  message_code?: string;
  message_origin?: string;
};

const SAFE_MESSAGE_CODES = new Set([
  'evaluation_job_updated',
  'quota_exceeded',
  'oom_killed',
  'timeout',
  'admission_denied',
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
