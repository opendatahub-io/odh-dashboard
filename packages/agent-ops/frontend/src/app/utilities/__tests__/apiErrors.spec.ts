import { isNotFoundError } from '~/app/utilities/apiErrors';

describe('isNotFoundError', () => {
  it('should return false when error is undefined', () => {
    expect(isNotFoundError(undefined)).toBe(false);
  });

  it('should return true when error has status_code 404', () => {
    const error = Object.assign(new Error('Not found'), { status_code: 404 });
    expect(isNotFoundError(error)).toBe(true);
  });

  it('should return true when error message indicates not found', () => {
    expect(isNotFoundError(new Error('the requested resource could not be found'))).toBe(true);
    expect(isNotFoundError(new Error('Agent not found'))).toBe(true);
  });

  it('should return false for other errors', () => {
    expect(isNotFoundError(new Error('Internal Server Error'))).toBe(false);
  });
});
