import { formatApiKeyError } from '../utils';

describe('formatApiKeyError', () => {
  describe('max expiration errors', () => {
    it('should format the upstream expiration error with the max days extracted', () => {
      expect(
        formatApiKeyError('requested expiration (8760h0m0s) exceeds maximum allowed (90 days)'),
      ).toBe(
        'Requested expiration exceeds maximum allowed (90 days). Select a shorter duration and try again.',
      );
    });

    it('should reflect different max day values in the formatted message', () => {
      expect(
        formatApiKeyError('requested expiration (720h0m0s) exceeds maximum allowed (30 days)'),
      ).toBe(
        'Requested expiration exceeds maximum allowed (30 days). Select a shorter duration and try again.',
      );
    });
  });

  describe('fallback capitalization', () => {
    it('should capitalize the first letter of an unrecognized error message', () => {
      expect(formatApiKeyError('something went wrong')).toBe('Something went wrong');
    });

    it('should not modify a message that is already capitalized', () => {
      expect(formatApiKeyError('Name is required')).toBe('Name is required');
    });

    it('should return the message unchanged if it starts with a non-letter character', () => {
      expect(formatApiKeyError('400: bad request')).toBe('400: bad request');
    });
  });

  describe('edge cases', () => {
    it('should return an empty string unchanged', () => {
      expect(formatApiKeyError('')).toBe('');
    });

    it('should capitalize a single character string', () => {
      expect(formatApiKeyError('x')).toBe('X');
    });
  });
});
