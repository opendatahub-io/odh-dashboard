import { ApiError, is503Error, is403Error, isConnectionError } from '~/app/api/dataRegistry';

describe('Error type guards', () => {
  describe('is503Error', () => {
    it('should return true for 503 ApiError', () => {
      const error = new ApiError(503, 'Service Unavailable');
      expect(is503Error(error)).toBe(true);
    });

    it('should return false for non-503 ApiError', () => {
      const error = new ApiError(404, 'Not Found');
      expect(is503Error(error)).toBe(false);
    });

    it('should return false for non-ApiError', () => {
      const error = new Error('Network error');
      expect(is503Error(error)).toBe(false);
    });
  });

  describe('is403Error', () => {
    it('should return true for 403 ApiError', () => {
      const error = new ApiError(403, 'Forbidden');
      expect(is403Error(error)).toBe(true);
    });

    it('should return false for non-403 ApiError', () => {
      const error = new ApiError(404, 'Not Found');
      expect(is403Error(error)).toBe(false);
    });

    it('should return false for non-ApiError', () => {
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

    it('should return false for ApiError with network message', () => {
      const error = new ApiError(500, 'network failure');
      expect(isConnectionError(error)).toBe(false);
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
});
