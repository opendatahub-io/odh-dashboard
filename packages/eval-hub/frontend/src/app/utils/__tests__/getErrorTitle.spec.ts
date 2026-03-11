import getErrorTitle from '~/app/utils/getErrorTitle';

describe('getErrorTitle', () => {
  const fallback = 'Something went wrong';

  it('should return fallback when error is not an Error instance', () => {
    expect(getErrorTitle('string error', fallback)).toBe(fallback);
    expect(getErrorTitle(null, fallback)).toBe(fallback);
    expect(getErrorTitle(undefined, fallback)).toBe(fallback);
    expect(getErrorTitle(42, fallback)).toBe(fallback);
  });

  it('should return fallback when error message does not match any pattern', () => {
    expect(getErrorTitle(new Error('something random'), fallback)).toBe(fallback);
  });

  it('should return "Authentication failed" for unauthorized errors', () => {
    expect(getErrorTitle(new Error('unauthorized'), fallback)).toBe('Authentication failed');
    expect(getErrorTitle(new Error('invalid auth_token'), fallback)).toBe('Authentication failed');
  });

  it('should return "Access denied" for forbidden errors', () => {
    expect(getErrorTitle(new Error('forbidden'), fallback)).toBe('Access denied');
    expect(getErrorTitle(new Error('no access allowed'), fallback)).toBe('Access denied');
  });

  it('should return "Resource not found" for not found errors', () => {
    expect(getErrorTitle(new Error('not found'), fallback)).toBe('Resource not found');
    expect(getErrorTitle(new Error('error: not_found'), fallback)).toBe('Resource not found');
  });

  it('should return "Invalid request" for bad request errors', () => {
    expect(getErrorTitle(new Error('invalid input'), fallback)).toBe('Invalid request');
    expect(getErrorTitle(new Error('bad request'), fallback)).toBe('Invalid request');
  });

  it('should return "Service unavailable" for connection errors', () => {
    expect(getErrorTitle(new Error('connection refused'), fallback)).toBe('Service unavailable');
    expect(getErrorTitle(new Error('service unavailable'), fallback)).toBe('Service unavailable');
  });

  it('should match patterns case-insensitively', () => {
    expect(getErrorTitle(new Error('UNAUTHORIZED'), fallback)).toBe('Authentication failed');
    expect(getErrorTitle(new Error('Forbidden'), fallback)).toBe('Access denied');
    expect(getErrorTitle(new Error('NOT FOUND'), fallback)).toBe('Resource not found');
  });

  it('should return the first matching title when multiple patterns could match', () => {
    expect(getErrorTitle(new Error('unauthorized access forbidden'), fallback)).toBe(
      'Authentication failed',
    );
  });
});
