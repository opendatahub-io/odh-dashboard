import { ApiError, is503Error, is403Error, isConnectionError } from '../dataRegistry';

describe('dataRegistry error guards', () => {
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
      const error = new Error('Generic error');
      expect(is503Error(error)).toBe(false);
    });

    it('should return false for non-Error values', () => {
      expect(is503Error(null)).toBe(false);
      expect(is503Error(undefined)).toBe(false);
      expect(is503Error('error')).toBe(false);
    });
  });

  describe('is403Error', () => {
    it('should return true for 403 ApiError', () => {
      const error = new ApiError(403, 'Forbidden');
      expect(is403Error(error)).toBe(true);
    });

    it('should return false for non-403 ApiError', () => {
      const error = new ApiError(500, 'Internal Server Error');
      expect(is403Error(error)).toBe(false);
    });

    it('should return false for non-ApiError', () => {
      const error = new Error('Generic error');
      expect(is403Error(error)).toBe(false);
    });
  });

  describe('isConnectionError', () => {
    it('should return true for NetworkError', () => {
      const error = new Error('NetworkError: Connection failed');
      expect(isConnectionError(error)).toBe(true);
    });

    it('should return true for Failed to fetch', () => {
      const error = new Error('Failed to fetch');
      expect(isConnectionError(error)).toBe(true);
    });

    it('should return true for network error (case-insensitive)', () => {
      const error = new Error('Network error occurred');
      expect(isConnectionError(error)).toBe(true);
    });

    it('should return false for non-connection errors', () => {
      const error = new Error('Validation failed');
      expect(isConnectionError(error)).toBe(false);
    });

    it('should return false for ApiError', () => {
      const error = new ApiError(500, 'Internal Server Error');
      expect(isConnectionError(error)).toBe(false);
    });

    it('should return false for non-Error values', () => {
      expect(isConnectionError(null)).toBe(false);
      expect(isConnectionError(undefined)).toBe(false);
    });
  });
});
