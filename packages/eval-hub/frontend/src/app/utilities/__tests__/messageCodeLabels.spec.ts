import { getMessageCodeLabel } from '~/app/utilities/messageCodeLabels';

describe('getMessageCodeLabel', () => {
  it('should return friendly label for known codes', () => {
    expect(getMessageCodeLabel('quota_exceeded')).toBe('Quota exceeded');
    expect(getMessageCodeLabel('oom_killed')).toBe('OOMKilled');
    expect(getMessageCodeLabel('timeout')).toBe('Timeout');
    expect(getMessageCodeLabel('admission_denied')).toBe('Admission denied');
  });

  it('should return the raw code for unknown codes', () => {
    expect(getMessageCodeLabel('some_unknown_code')).toBe('some_unknown_code');
  });

  it('should return the raw code for empty string', () => {
    expect(getMessageCodeLabel('')).toBe('');
  });

  it('should return the raw code for unknown codes matching Object.prototype keys', () => {
    expect(getMessageCodeLabel('toString')).toBe('toString');
    expect(getMessageCodeLabel('constructor')).toBe('constructor');
    expect(getMessageCodeLabel('hasOwnProperty')).toBe('hasOwnProperty');
  });
});
