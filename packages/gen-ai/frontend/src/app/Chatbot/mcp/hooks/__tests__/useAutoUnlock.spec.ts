import { renderHook, act, waitFor } from '@testing-library/react';
import { MCPServer } from '~/app/types';
import { ServerStatusInfo } from '~/app/hooks/useMCPServerStatuses';
import useAutoUnlock from '~/app/Chatbot/mcp/hooks/useAutoUnlock';

describe('useAutoUnlock', () => {
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

  const mockCheckServerStatus = jest.fn();
  const mockGetToken = jest.fn();
  const mockOnTokenUpdate = jest.fn();
  const mockOnFetchTools = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty auto-unlocking servers', () => {
    const { result } = renderHook(() =>
      useAutoUnlock({
        checkServerStatus: mockCheckServerStatus,
        selectedServers: [],
        isInitialLoadComplete: false,
        getToken: mockGetToken,
        onTokenUpdate: mockOnTokenUpdate,
        onFetchTools: mockOnFetchTools,
      }),
    );

    expect(result.current.autoUnlockingServers.size).toBe(0);
  });

  it('should auto-unlock server when coming from route with connected status', async () => {
    const mockStatusInfo: ServerStatusInfo = {
      status: 'connected',
      message: 'Connected',
    };

    mockCheckServerStatus.mockResolvedValue(mockStatusInfo);
    mockGetToken.mockReturnValue(undefined);
    mockOnFetchTools.mockResolvedValue(undefined);

    const initialServerStatuses = new Map<string, ServerStatusInfo>([
      ['https://server1.com', mockStatusInfo],
    ]);

    renderHook(() =>
      useAutoUnlock({
        checkServerStatus: mockCheckServerStatus,
        selectedServers: [mockServer],
        isInitialLoadComplete: true,
        initialServerStatuses,
        getToken: mockGetToken,
        onTokenUpdate: mockOnTokenUpdate,
        onFetchTools: mockOnFetchTools,
      }),
    );

    await waitFor(() => {
      expect(mockOnTokenUpdate).toHaveBeenCalledWith('https://server1.com', {
        token: '',
        authenticated: true,
        autoConnected: true,
      });
    });
  });

  it('should not auto-unlock if server is already authenticated', async () => {
    const mockStatusInfo: ServerStatusInfo = {
      status: 'connected',
      message: 'Connected',
    };

    mockGetToken.mockReturnValue({
      token: 'existing',
      authenticated: true,
      autoConnected: false,
    });

    const initialServerStatuses = new Map<string, ServerStatusInfo>([
      ['https://server1.com', mockStatusInfo],
    ]);

    renderHook(() =>
      useAutoUnlock({
        checkServerStatus: mockCheckServerStatus,
        selectedServers: [mockServer],
        isInitialLoadComplete: true,
        initialServerStatuses,
        getToken: mockGetToken,
        onTokenUpdate: mockOnTokenUpdate,
        onFetchTools: mockOnFetchTools,
      }),
    );

    await waitFor(() => {
      expect(mockOnTokenUpdate).not.toHaveBeenCalled();
    });
  });

  it('should manually handle auto-unlock', async () => {
    const mockStatusInfo: ServerStatusInfo = {
      status: 'connected',
      message: 'Connected',
    };

    mockCheckServerStatus.mockResolvedValue(mockStatusInfo);
    mockOnFetchTools.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useAutoUnlock({
        checkServerStatus: mockCheckServerStatus,
        selectedServers: [],
        isInitialLoadComplete: false,
        getToken: mockGetToken,
        onTokenUpdate: mockOnTokenUpdate,
        onFetchTools: mockOnFetchTools,
      }),
    );

    await act(async () => {
      await result.current.handleAutoUnlock(mockServer);
    });

    expect(mockCheckServerStatus).toHaveBeenCalledWith('https://server1.com');
    expect(mockOnTokenUpdate).toHaveBeenCalledWith('https://server1.com', {
      token: '',
      authenticated: true,
      autoConnected: true,
    });
    expect(mockOnFetchTools).toHaveBeenCalledWith('https://server1.com', '');
  });

  it('should not attempt connection for auth_required server in route state path', async () => {
    mockGetToken.mockReturnValue(undefined);

    const initialServerStatuses = new Map<string, ServerStatusInfo>([
      ['https://server1.com', { status: 'auth_required', message: 'Token required' }],
    ]);

    renderHook(() =>
      useAutoUnlock({
        checkServerStatus: mockCheckServerStatus,
        selectedServers: [mockServer],
        isInitialLoadComplete: true,
        initialServerStatuses,
        getToken: mockGetToken,
        onTokenUpdate: mockOnTokenUpdate,
        onFetchTools: mockOnFetchTools,
      }),
    );

    await waitFor(() => {
      expect(mockCheckServerStatus).not.toHaveBeenCalled();
    });
    expect(mockOnTokenUpdate).not.toHaveBeenCalled();
  });

  it('should auto-connect server in profile load path when no initialServerStatuses', async () => {
    const mockStatusInfo: ServerStatusInfo = { status: 'connected', message: 'Connected' };
    mockCheckServerStatus.mockResolvedValue(mockStatusInfo);
    mockGetToken.mockReturnValue(undefined);
    mockOnFetchTools.mockResolvedValue(undefined);

    renderHook(() =>
      useAutoUnlock({
        checkServerStatus: mockCheckServerStatus,
        selectedServers: [mockServer],
        isInitialLoadComplete: true,
        initialServerStatuses: new Map(),
        getToken: mockGetToken,
        onTokenUpdate: mockOnTokenUpdate,
        onFetchTools: mockOnFetchTools,
      }),
    );

    await waitFor(() => {
      expect(mockOnTokenUpdate).toHaveBeenCalledWith('https://server1.com', {
        token: '',
        authenticated: true,
        autoConnected: true,
      });
      expect(mockOnFetchTools).toHaveBeenCalledWith('https://server1.com', '');
    });
  });

  it('should attempt connection in profile load path when server needs a token', async () => {
    const mockStatusInfo: ServerStatusInfo = {
      status: 'auth_required',
      message: 'Token required',
    };
    mockCheckServerStatus.mockResolvedValue(mockStatusInfo);
    mockGetToken.mockReturnValue(undefined);

    renderHook(() =>
      useAutoUnlock({
        checkServerStatus: mockCheckServerStatus,
        selectedServers: [mockServer],
        isInitialLoadComplete: true,
        initialServerStatuses: new Map(),
        getToken: mockGetToken,
        onTokenUpdate: mockOnTokenUpdate,
        onFetchTools: mockOnFetchTools,
      }),
    );

    await waitFor(() => {
      expect(mockCheckServerStatus).toHaveBeenCalledWith('https://server1.com');
    });
    expect(mockOnTokenUpdate).not.toHaveBeenCalled();
  });

  it('should not auto-connect when no selected servers in profile load path', async () => {
    renderHook(() =>
      useAutoUnlock({
        checkServerStatus: mockCheckServerStatus,
        selectedServers: [],
        isInitialLoadComplete: true,
        initialServerStatuses: new Map(),
        getToken: mockGetToken,
        onTokenUpdate: mockOnTokenUpdate,
        onFetchTools: mockOnFetchTools,
      }),
    );

    await waitFor(() => {
      expect(mockCheckServerStatus).not.toHaveBeenCalled();
    });
  });

  it('should handle auto-unlock failures gracefully', async () => {
    mockCheckServerStatus.mockRejectedValue(new Error('Connection failed'));

    const { result } = renderHook(() =>
      useAutoUnlock({
        checkServerStatus: mockCheckServerStatus,
        selectedServers: [],
        isInitialLoadComplete: false,
        getToken: mockGetToken,
        onTokenUpdate: mockOnTokenUpdate,
        onFetchTools: mockOnFetchTools,
      }),
    );

    await act(async () => {
      await result.current.handleAutoUnlock(mockServer);
    });

    expect(mockOnTokenUpdate).not.toHaveBeenCalled();
    expect(mockOnFetchTools).not.toHaveBeenCalled();
  });
});
