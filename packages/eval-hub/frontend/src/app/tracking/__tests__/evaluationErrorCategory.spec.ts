/* eslint-disable camelcase -- fields match the Eval Hub API response. */
import { evaluationErrorCategory } from '~/app/tracking/evaluationErrorCategory';

describe('evaluationErrorCategory', () => {
  it.each([
    'evaluation_job_updated',
    'quota_exceeded',
    'oom_killed',
    'timeout',
    'admission_denied',
  ])('returns the allowlisted message code %s', (messageCode) => {
    expect(
      evaluationErrorCategory({
        message: 'UI diagnostic',
        message_code: messageCode,
      }),
    ).toBe(messageCode);
  });

  it('returns unknown_error for an unrecognized message code', () => {
    expect(
      evaluationErrorCategory({
        message: 'UI diagnostic',
        message_code: 'failed: private-resource-name',
      }),
    ).toBe('unknown_error');
  });

  it.each([null, 123, ['evaluation_job_updated'], { code: 'evaluation_job_updated' }])(
    'returns unknown_error for a malformed message code without forwarding it',
    (messageCode) => {
      expect(
        evaluationErrorCategory({
          message: 'UI diagnostic',
          message_code: messageCode as unknown as string,
        }),
      ).toBe('unknown_error');
    },
  );

  it('returns unknown_error when a diagnostic has no message code', () => {
    expect(evaluationErrorCategory({ message: 'UI diagnostic' })).toBe('unknown_error');
  });

  it.each([undefined, {}])('omits the category when no diagnostic is present', (message) => {
    expect(evaluationErrorCategory(message)).toBeUndefined();
  });
});
