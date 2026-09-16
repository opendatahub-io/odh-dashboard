import { is503Error, is403Error, isConflictError, isConnectionError } from '~/app/api/dataRegistry';

describe('Error type guards', () => {
  describe('is503Error', () => {
    it('should return true for a standardized 503 error', () => {
      const error = new Error('status code 503: Service Unavailable');
      expect(is503Error(error)).toBe(true);
    });

    it('should return false for a non-503 error', () => {
      const error = new Error('status code 404: Not Found');
      expect(is503Error(error)).toBe(false);
    });

    it('should return false for a network error', () => {
      const error = new Error('Network error');
      expect(is503Error(error)).toBe(false);
    });
  });

  describe('is403Error', () => {
    it('should return true for a standardized 403 error', () => {
      const error = new Error('status code 403: Forbidden');
      expect(is403Error(error)).toBe(true);
    });

    it('should return false for a non-403 error', () => {
      const error = new Error('status code 404: Not Found');
      expect(is403Error(error)).toBe(false);
    });

    it('should return false for a network error', () => {
      const error = new Error('Network error');
      expect(is403Error(error)).toBe(false);
    });
  });

  describe('isConnectionError', () => {
    it('should return true for NetworkError', () => {
      const error = new Error('NetworkError when attempting to fetch resource');
      expect(isConnectionError(error)).toBe(true);
    });

    it('should return true for Failed to fetch', () => {
      const error = new Error('Failed to fetch');
      expect(isConnectionError(error)).toBe(true);
    });

    it('should return true for network in lowercase', () => {
      const error = new Error('network connection lost');
      expect(isConnectionError(error)).toBe(true);
    });

    it('should return true for the generic error from handleRestFailures', () => {
      expect(isConnectionError(new Error('Error communicating with server'))).toBe(true);
    });

    it('should return false for non-network error', () => {
      const error = new Error('Something went wrong');
      expect(isConnectionError(error)).toBe(false);
    });

    it('should return false for non-Error', () => {
      expect(isConnectionError('not an error')).toBe(false);
      expect(isConnectionError(null)).toBe(false);
      expect(isConnectionError(undefined)).toBe(false);
    });
  });

  describe('isConflictError', () => {
    it('should return true for a standardized 409 error', () => {
      expect(isConflictError(new Error('status code 409: Resource already exists'))).toBe(true);
    });

    it('should return false for a non-conflict error', () => {
      expect(isConflictError(new Error('status code 500: Server error'))).toBe(false);
    });
  });
});
