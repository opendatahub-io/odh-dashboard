import { renderHook, act, waitFor } from '@testing-library/react';
import { GenAiAPIs } from '~/app/types';
import useServerTools from '~/app/Chatbot/mcp/hooks/useServerTools';

describe('useServerTools', () => {
  const mockGetMCPServerTools = jest.fn();
  const mockApi = {
    getMCPServerTools: mockGetMCPServerTools,
  } as unknown as GenAiAPIs;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() =>
      useServerTools({
        api: mockApi,
        apiAvailable: true,
      }),
    );

    expect(result.current.serverToolsCount.size).toBe(0);
    expect(result.current.fetchingToolsServers.size).toBe(0);
  });

  it('should fetch tools count successfully', async () => {
    mockGetMCPServerTools.mockResolvedValue({
      status: 'success',
      // eslint-disable-next-line camelcase
      tools_count: 5,
    });

    const { result } = renderHook(() =>
      useServerTools({
        api: mockApi,
        apiAvailable: true,
      }),
    );

    await act(async () => {
      await result.current.fetchToolsCount('https://server1.com', 'test-token');
    });

    await waitFor(() => {
      expect(result.current.serverToolsCount.get('https://server1.com')).toBe(5);
    });

    expect(mockGetMCPServerTools).toHaveBeenCalledWith(
      // eslint-disable-next-line camelcase
      { server_url: 'https://server1.com' },
      { headers: { 'X-MCP-Bearer': 'Bearer test-token' } },
    );
  });

  it('should handle token with Bearer prefix already present', async () => {
    mockGetMCPServerTools.mockResolvedValue({
      status: 'success',
      // eslint-disable-next-line camelcase
      tools_count: 3,
    });

    const { result } = renderHook(() =>
      useServerTools({
        api: mockApi,
        apiAvailable: true,
      }),
    );

    await act(async () => {
      await result.current.fetchToolsCount('https://server1.com', 'Bearer existing-token');
    });

    expect(mockGetMCPServerTools).toHaveBeenCalledWith(
      // eslint-disable-next-line camelcase
      { server_url: 'https://server1.com' },
      { headers: { 'X-MCP-Bearer': 'Bearer existing-token' } },
    );
  });

  it('should fetch without token when not provided', async () => {
    mockGetMCPServerTools.mockResolvedValue({
      status: 'success',
      // eslint-disable-next-line camelcase
      tools_count: 2,
    });

    const { result } = renderHook(() =>
      useServerTools({
        api: mockApi,
        apiAvailable: true,
      }),
    );

    await act(async () => {
      await result.current.fetchToolsCount('https://server1.com');
    });

    expect(mockGetMCPServerTools).toHaveBeenCalledWith(
      // eslint-disable-next-line camelcase
      { server_url: 'https://server1.com' },
      { headers: {} },
    );
  });

  it('should track fetching state', async () => {
    let resolvePromise: (
      value:
        | { status: string; tools_count?: number }
        | PromiseLike<{ status: string; tools_count?: number }>,
    ) => void;
    const promise = new Promise<{ status: string; tools_count?: number }>((resolve) => {
      resolvePromise = resolve;
    });
    mockGetMCPServerTools.mockReturnValue(promise);

    const { result } = renderHook(() =>
      useServerTools({
        api: mockApi,
        apiAvailable: true,
      }),
    );

    act(() => {
      result.current.fetchToolsCount('https://server1.com');
    });

    await waitFor(() => {
      expect(result.current.fetchingToolsServers.has('https://server1.com')).toBe(true);
    });

    await act(async () => {
      // eslint-disable-next-line camelcase
      resolvePromise!({ status: 'success', tools_count: 4 });
      await promise;
    });

    await waitFor(() => {
      expect(result.current.fetchingToolsServers.has('https://server1.com')).toBe(false);
    });
  });

  it('should handle API errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockGetMCPServerTools.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() =>
      useServerTools({
        api: mockApi,
        apiAvailable: true,
      }),
    );

    await act(async () => {
      await result.current.fetchToolsCount('https://server1.com');
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch tools count'),
        expect.any(Error),
      );
    });

    expect(result.current.fetchingToolsServers.has('https://server1.com')).toBe(false);

    consoleErrorSpy.mockRestore();
  });

  it('should not fetch when API is not available', async () => {
    const { result } = renderHook(() =>
      useServerTools({
        api: mockApi,
        apiAvailable: false,
      }),
    );

    await act(async () => {
      await result.current.fetchToolsCount('https://server1.com');
    });

    expect(mockGetMCPServerTools).not.toHaveBeenCalled();
  });

  it('should handle multiple concurrent fetches', async () => {
    mockGetMCPServerTools.mockImplementation((params) => {
      const count = params.server_url.includes('server1') ? 5 : 10;
      // eslint-disable-next-line camelcase
      return Promise.resolve({ status: 'success', tools_count: count });
    });

    const { result } = renderHook(() =>
      useServerTools({
        api: mockApi,
        apiAvailable: true,
      }),
    );

    await act(async () => {
      await Promise.all([
        result.current.fetchToolsCount('https://server1.com'),
        result.current.fetchToolsCount('https://server2.com'),
      ]);
    });

    await waitFor(() => {
      expect(result.current.serverToolsCount.get('https://server1.com')).toBe(5);
      expect(result.current.serverToolsCount.get('https://server2.com')).toBe(10);
    });
  });
});
