import { renderHook, waitFor } from '@testing-library/react';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/internal/concepts/analyticsTracking/trackingProperties';
import useGenerateMaaSToken from '~/app/hooks/useGenerateMaaSToken';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';

// Mock tracking
jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
}));

// Mock useGenAiAPI
const mockGenerateMaaSToken = jest.fn();

jest.mock('~/app/hooks/useGenAiAPI', () => ({
  useGenAiAPI: jest.fn(() => ({
    api: {
      generateMaaSToken: mockGenerateMaaSToken,
    },
    apiAvailable: true,
  })),
}));

const mockUseGenAiAPI = jest.mocked(useGenAiAPI);

describe('useGenerateMaaSToken - Event Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Token Generation', () => {
    it('should fire tracking event when token is generated successfully', async () => {
      const mockResponse = {
        token: 'generated-token-123',
        expiration: '2024-12-31',
      };

      mockGenerateMaaSToken.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGenerateMaaSToken());

      await result.current.generateToken();

      await waitFor(() => {
        expect(fireFormTrackingEvent).toHaveBeenCalledWith('MaaS API Token Generated', {
          outcome: TrackingOutcome.submit,
          success: true,
        });
      });
    });

    it('should track token generation with custom expiration', async () => {
      const mockResponse = {
        token: 'generated-token-456',
        expiration: '2025-06-30',
      };

      mockGenerateMaaSToken.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGenerateMaaSToken());

      await result.current.generateToken('2025-06-30');

      await waitFor(() => {
        expect(fireFormTrackingEvent).toHaveBeenCalledWith('MaaS API Token Generated', {
          outcome: TrackingOutcome.submit,
          success: true,
        });
      });
    });

    it('should call tracking exactly once per generation', async () => {
      const mockResponse = {
        token: 'token-abc',
        expiration: '2024-12-31',
      };

      mockGenerateMaaSToken.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGenerateMaaSToken());

      await result.current.generateToken();

      await waitFor(() => {
        expect(fireFormTrackingEvent).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Failed Token Generation', () => {
    it('should fire tracking event with error when token generation fails', async () => {
      const errorMessage = 'Failed to generate token: Unauthorized';
      mockGenerateMaaSToken.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useGenerateMaaSToken());

      await result.current.generateToken();

      await waitFor(() => {
        expect(fireFormTrackingEvent).toHaveBeenCalledWith('MaaS API Token Generated', {
          outcome: TrackingOutcome.submit,
          success: false,
          error: errorMessage,
        });
      });
    });

    it('should track generic error message for non-Error objects', async () => {
      mockGenerateMaaSToken.mockRejectedValue('String error');

      const { result } = renderHook(() => useGenerateMaaSToken());

      await result.current.generateToken();

      await waitFor(() => {
        expect(fireFormTrackingEvent).toHaveBeenCalledWith('MaaS API Token Generated', {
          outcome: TrackingOutcome.submit,
          success: false,
          error: 'Failed to generate MaaS token',
        });
      });
    });

    it('should track network errors correctly', async () => {
      const networkError = new Error('Network request failed');
      mockGenerateMaaSToken.mockRejectedValue(networkError);

      const { result } = renderHook(() => useGenerateMaaSToken());

      await result.current.generateToken();

      await waitFor(() => {
        expect(fireFormTrackingEvent).toHaveBeenCalledWith('MaaS API Token Generated', {
          outcome: TrackingOutcome.submit,
          success: false,
          error: 'Network request failed',
        });
      });
    });

    it('should track authorization errors correctly', async () => {
      const authError = new Error('Unauthorized: Invalid credentials');
      mockGenerateMaaSToken.mockRejectedValue(authError);

      const { result } = renderHook(() => useGenerateMaaSToken());

      await result.current.generateToken();

      await waitFor(() => {
        expect(fireFormTrackingEvent).toHaveBeenCalledWith('MaaS API Token Generated', {
          outcome: TrackingOutcome.submit,
          success: false,
          error: 'Unauthorized: Invalid credentials',
        });
      });
    });
  });

  describe('Multiple Generation Attempts', () => {
    it('should track each generation attempt independently', async () => {
      const mockResponse = {
        token: 'token-xyz',
        expiration: '2024-12-31',
      };

      mockGenerateMaaSToken.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGenerateMaaSToken());

      // First generation
      await result.current.generateToken();

      await waitFor(() => {
        expect(fireFormTrackingEvent).toHaveBeenCalledTimes(1);
      });

      // Reset token
      result.current.resetToken();

      // Second generation
      await result.current.generateToken();

      await waitFor(() => {
        expect(fireFormTrackingEvent).toHaveBeenCalledTimes(2);
      });

      // Both calls should have same parameters
      expect(fireFormTrackingEvent).toHaveBeenCalledWith('MaaS API Token Generated', {
        outcome: TrackingOutcome.submit,
        success: true,
      });
    });

    it('should track success after previous failure', async () => {
      const { result } = renderHook(() => useGenerateMaaSToken());

      // First attempt - failure
      mockGenerateMaaSToken.mockRejectedValueOnce(new Error('Server error'));
      await result.current.generateToken();

      await waitFor(() => {
        expect(fireFormTrackingEvent).toHaveBeenCalledWith('MaaS API Token Generated', {
          outcome: TrackingOutcome.submit,
          success: false,
          error: 'Server error',
        });
      });

      // Second attempt - success
      mockGenerateMaaSToken.mockResolvedValueOnce({
        token: 'success-token',
        expiration: '2024-12-31',
      });

      result.current.resetToken();
      await result.current.generateToken();

      await waitFor(() => {
        expect(fireFormTrackingEvent).toHaveBeenLastCalledWith('MaaS API Token Generated', {
          outcome: TrackingOutcome.submit,
          success: true,
        });
      });

      expect(fireFormTrackingEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe('No Tracking for Other Operations', () => {
    it('should not fire tracking when resetToken is called', () => {
      const { result } = renderHook(() => useGenerateMaaSToken());

      result.current.resetToken();

      expect(fireFormTrackingEvent).not.toHaveBeenCalled();
    });

    it('should not fire tracking on initial render', () => {
      renderHook(() => useGenerateMaaSToken());

      expect(fireFormTrackingEvent).not.toHaveBeenCalled();
    });
  });

  describe('API Unavailable', () => {
    it('should not fire tracking when API is not available', async () => {
      // Mock API as unavailable
      mockUseGenAiAPI.mockReturnValueOnce({
        api: {
          generateMaaSToken: mockGenerateMaaSToken,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        apiAvailable: false,
        refreshAllAPI: jest.fn(),
      });

      const { result } = renderHook(() => useGenerateMaaSToken());

      // Should throw NotReadyError
      await expect(result.current.generateToken()).rejects.toThrow('API not yet available');

      // Should not fire tracking event
      expect(fireFormTrackingEvent).not.toHaveBeenCalled();
    });
  });
});
