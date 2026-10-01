import { parseErrorStatus } from '../parseErrorStatus';

describe('parseErrorStatus', () => {
  it('should extract status code from supported error message formats', () => {
    expect(parseErrorStatus(new Error('Request failed with status code 404'))).toBe(404);
    expect(parseErrorStatus(new Error('Error: status: 403 - Forbidden'))).toBe(403);
    expect(parseErrorStatus(new Error('Failed to fetch: 503'))).toBe(503);
  });

  it('should handle case-insensitive status code patterns', () => {
    expect(parseErrorStatus(new Error('Request failed with Status Code 500'))).toBe(500);
  });

  it('should return undefined for non-matching or invalid status codes', () => {
    expect(parseErrorStatus(new Error('Network timeout occurred'))).toBeUndefined();
    expect(parseErrorStatus(new Error('Invalid status code 999'))).toBeUndefined();
    expect(parseErrorStatus(new Error('status code 99'))).toBeUndefined();
    expect(parseErrorStatus(new Error('status code 600'))).toBeUndefined();
  });

  it('should prefer the first supported status code format', () => {
    expect(parseErrorStatus(new Error('status code 400 after status 200'))).toBe(400);
  });
});
