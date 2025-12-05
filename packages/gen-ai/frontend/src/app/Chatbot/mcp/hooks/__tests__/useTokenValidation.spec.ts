import { renderHook, act, waitFor } from '@testing-library/react';
import { GenAiAPIs, MCPServer } from '~/app/types';
import useTokenValidation, { ValidationResult } from '~/app/Chatbot/mcp/hooks/useTokenValidation';

// Mock the tracking functions
jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
}));

describe('useTokenValidation', () => {
  const mockServer: MCPServer = {
    id: 'server1',
    name: 'Test Server',
    description: 'Test',
    status: 'active',
    endpoint: 'View',
    connectionUrl: 'https://server1.com',
    tools: 0,
    version: 'Unknown',
  };

  const mockGetMCPServerStatus = jest.fn();
  const mockApi = {
    getMCPServerStatus: mockGetMCPServerStatus,
  } as unknown as GenAiAPIs;

  const mockCheckServerStatus = jest.fn();
  const mockOnTokenUpdate = jest.fn();
  const mockGetToken = jest.fn();
  const mockOnFetchTools = jest.fn();
  const mockOnConfigModalOpen = jest.fn();
  const mockOnConfigModalClose = jest.fn();
  const mockOnSuccessModalOpen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() =>
      useTokenValidation({
        api: mockApi,
        apiAvailable: true,
        transformedServers: [mockServer],
        checkServerStatus: mockCheckServerStatus,
        onTokenUpdate: mockOnTokenUpdate,
        getToken: mockGetToken,
        onFetchTools: mockOnFetchTools,
        onConfigModalOpen: mockOnConfigModalOpen,
        onConfigModalClose: mockOnConfigModalClose,
        onSuccessModalOpen: mockOnSuccessModalOpen,
      }),
    );

    expect(result.current.validatingServers.size).toBe(0);
    expect(result.current.validationErrors.size).toBe(0);
    expect(result.current.checkingServers.size).toBe(0);
  });

  it('should validate server token successfully', async () => {
    mockGetMCPServerStatus.mockResolvedValue({
      status: 'connected',
    });
    mockOnFetchTools.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useTokenValidation({
        api: mockApi,
        apiAvailable: true,
        transformedServers: [mockServer],
        checkServerStatus: mockCheckServerStatus,
        onTokenUpdate: mockOnTokenUpdate,
        getToken: mockGetToken,
        onFetchTools: mockOnFetchTools,
        onConfigModalOpen: mockOnConfigModalOpen,
        onConfigModalClose: mockOnConfigModalClose,
        onSuccessModalOpen: mockOnSuccessModalOpen,
      }),
    );

    let validationResult: ValidationResult | undefined;
    await act(async () => {
      validationResult = await result.current.validateServerToken(
        'https://server1.com',
        'test-token',
      );
    });

    await waitFor(() => {
      expect(validationResult).toEqual({ success: true });
      expect(mockOnTokenUpdate).toHaveBeenCalledWith('https://server1.com', {
        token: 'test-token',
        authenticated: true,
        autoConnected: false,
      });
      expect(mockOnFetchTools).toHaveBeenCalled();
      expect(mockOnConfigModalClose).toHaveBeenCalled();
      expect(mockOnSuccessModalOpen).toHaveBeenCalledWith(mockServer);
    });
  });

  it('should handle validation failure', async () => {
    mockGetMCPServerStatus.mockResolvedValue({
      status: 'error',
      message: 'Connection failed',
    });

    const { result } = renderHook(() =>
      useTokenValidation({
        api: mockApi,
        apiAvailable: true,
        transformedServers: [mockServer],
        checkServerStatus: mockCheckServerStatus,
        onTokenUpdate: mockOnTokenUpdate,
        getToken: mockGetToken,
        onFetchTools: mockOnFetchTools,
        onConfigModalOpen: mockOnConfigModalOpen,
        onConfigModalClose: mockOnConfigModalClose,
        onSuccessModalOpen: mockOnSuccessModalOpen,
      }),
    );

    let validationResult: ValidationResult | undefined;
    await act(async () => {
      validationResult = await result.current.validateServerToken(
        'https://server1.com',
        'bad-token',
      );
    });

    expect(validationResult).toEqual({ success: false, error: 'Connection failed' });
    expect(result.current.validationErrors.get('https://server1.com')).toBe('Connection failed');
  });

  it('should handle lock click for unauthenticated server', async () => {
    mockGetToken.mockReturnValue(undefined);
    mockCheckServerStatus.mockResolvedValue({ status: 'connected' });
    mockOnFetchTools.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useTokenValidation({
        api: mockApi,
        apiAvailable: true,
        transformedServers: [mockServer],
        checkServerStatus: mockCheckServerStatus,
        onTokenUpdate: mockOnTokenUpdate,
        getToken: mockGetToken,
        onFetchTools: mockOnFetchTools,
        onConfigModalOpen: mockOnConfigModalOpen,
        onConfigModalClose: mockOnConfigModalClose,
        onSuccessModalOpen: mockOnSuccessModalOpen,
      }),
    );

    await act(async () => {
      await result.current.handleLockClick(mockServer);
    });

    await waitFor(() => {
      expect(mockOnTokenUpdate).toHaveBeenCalledWith('https://server1.com', {
        token: '',
        authenticated: true,
        autoConnected: true,
      });
      expect(mockOnSuccessModalOpen).toHaveBeenCalledWith(mockServer);
    });
  });

  it('should open success modal for already authenticated server', async () => {
    mockGetToken.mockReturnValue({
      token: 'existing',
      authenticated: true,
      autoConnected: false,
    });

    const { result } = renderHook(() =>
      useTokenValidation({
        api: mockApi,
        apiAvailable: true,
        transformedServers: [mockServer],
        checkServerStatus: mockCheckServerStatus,
        onTokenUpdate: mockOnTokenUpdate,
        getToken: mockGetToken,
        onFetchTools: mockOnFetchTools,
        onConfigModalOpen: mockOnConfigModalOpen,
        onConfigModalClose: mockOnConfigModalClose,
        onSuccessModalOpen: mockOnSuccessModalOpen,
      }),
    );

    await act(async () => {
      await result.current.handleLockClick(mockServer);
    });

    expect(mockOnSuccessModalOpen).toHaveBeenCalledWith(mockServer);
    expect(mockCheckServerStatus).not.toHaveBeenCalled();
  });

  it('should clear validation error for a server', () => {
    const { result } = renderHook(() =>
      useTokenValidation({
        api: mockApi,
        apiAvailable: true,
        transformedServers: [mockServer],
        checkServerStatus: mockCheckServerStatus,
        onTokenUpdate: mockOnTokenUpdate,
        getToken: mockGetToken,
        onFetchTools: mockOnFetchTools,
        onConfigModalOpen: mockOnConfigModalOpen,
        onConfigModalClose: mockOnConfigModalClose,
        onSuccessModalOpen: mockOnSuccessModalOpen,
      }),
    );

    // Manually set an error (simulating a previous validation failure)
    act(() => {
      result.current.validationErrors.set('https://server1.com', 'Test error');
    });

    expect(result.current.validationErrors.get('https://server1.com')).toBe('Test error');

    // Clear the error
    act(() => {
      result.current.clearValidationError('https://server1.com');
    });

    expect(result.current.validationErrors.has('https://server1.com')).toBe(false);
    expect(result.current.validationErrors.size).toBe(0);
  });
});
