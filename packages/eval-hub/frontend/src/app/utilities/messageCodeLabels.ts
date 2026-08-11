/* eslint-disable camelcase -- keys match API message_code values verbatim */
const MESSAGE_CODE_LABELS: Record<string, string> = {
  quota_exceeded: 'Quota exceeded',
  oom_killed: 'OOMKilled',
  timeout: 'Timeout',
  admission_denied: 'Admission denied',
};
/* eslint-enable camelcase */

export const getMessageCodeLabel = (code: string): string =>
  Object.hasOwn(MESSAGE_CODE_LABELS, code) ? MESSAGE_CODE_LABELS[code] : code;
