import { renderHook, act } from '@testing-library/react';
import { MCPServer } from '~/app/types';
import useServerSelection from '~/app/Chatbot/mcp/hooks/useServerSelection';

describe('useServerSelection', () => {
  const mockServers: MCPServer[] = [
    {
      id: 'server1',
      name: 'Server 1',
      description: 'Test server 1',
      status: 'active',
      endpoint: 'View',
      connectionUrl: 'https://server1.com',
      tools: 0,
      version: 'Unknown',
    },
    {
      id: 'server2',
      name: 'Server 2',
      description: 'Test server 2',
      status: 'active',
      endpoint: 'View',
      connectionUrl: 'https://server2.com',
      tools: 0,
      version: 'Unknown',
    },
  ];

  const mockOnSelectionChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty selection and initial load not complete', () => {
    const { result } = renderHook(() =>
      useServerSelection({
        transformedServers: [],
        onSelectionChange: mockOnSelectionChange,
      }),
    );

    expect(result.current.selectedServers).toEqual([]);
    expect(result.current.isInitialLoadComplete).toBe(false);
  });

  it('should mark initial load as complete when servers are available but no initial selection', () => {
    const { result } = renderHook(() =>
      useServerSelection({
        transformedServers: mockServers,
        onSelectionChange: mockOnSelectionChange,
      }),
    );

    expect(result.current.isInitialLoadComplete).toBe(true);
  });

  it('should initialize with selected servers from route state', () => {
    const { result } = renderHook(() =>
      useServerSelection({
        transformedServers: mockServers,
        initialSelectedServerIds: ['server1'],
        onSelectionChange: mockOnSelectionChange,
      }),
    );

    expect(result.current.selectedServers).toHaveLength(1);
    expect(result.current.selectedServers[0].id).toBe('server1');
    expect(result.current.isInitialLoadComplete).toBe(true);
  });

  it('should notify parent of selection changes', () => {
    const { result } = renderHook(() =>
      useServerSelection({
        transformedServers: mockServers,
        onSelectionChange: mockOnSelectionChange,
      }),
    );

    act(() => {
      result.current.setSelectedServers([mockServers[0]]);
    });

    expect(mockOnSelectionChange).toHaveBeenCalledWith(['server1']);
  });

  it('should not process initial selection twice', () => {
    const { result, rerender } = renderHook(
      ({ servers, initialIds }) =>
        useServerSelection({
          transformedServers: servers,
          initialSelectedServerIds: initialIds,
          onSelectionChange: mockOnSelectionChange,
        }),
      {
        initialProps: {
          servers: mockServers,
          initialIds: ['server1'],
        },
      },
    );

    expect(result.current.selectedServers).toHaveLength(1);

    // Rerender with different initial IDs - should not change selection
    rerender({
      servers: mockServers,
      initialIds: ['server2'],
    });

    expect(result.current.selectedServers).toHaveLength(1);
    expect(result.current.selectedServers[0].id).toBe('server1');
  });

  it('should handle selection of multiple servers from route state', () => {
    const { result } = renderHook(() =>
      useServerSelection({
        transformedServers: mockServers,
        initialSelectedServerIds: ['server1', 'server2'],
        onSelectionChange: mockOnSelectionChange,
      }),
    );

    expect(result.current.selectedServers).toHaveLength(2);
    expect(result.current.selectedServers.map((s) => s.id)).toEqual(['server1', 'server2']);
  });

  it('should handle invalid initial server IDs gracefully', () => {
    const { result } = renderHook(() =>
      useServerSelection({
        transformedServers: mockServers,
        initialSelectedServerIds: ['nonexistent'],
        onSelectionChange: mockOnSelectionChange,
      }),
    );

    expect(result.current.selectedServers).toHaveLength(0);
    expect(result.current.isInitialLoadComplete).toBe(true);
  });

  it('should manually update selected servers', () => {
    const { result } = renderHook(() =>
      useServerSelection({
        transformedServers: mockServers,
        onSelectionChange: mockOnSelectionChange,
      }),
    );

    act(() => {
      result.current.setSelectedServers([mockServers[1]]);
    });

    expect(result.current.selectedServers).toHaveLength(1);
    expect(result.current.selectedServers[0].id).toBe('server2');
  });

  it('should wait for servers to be loaded before processing initial selection', () => {
    const { result, rerender } = renderHook(
      ({ servers }: { servers: MCPServer[] }) =>
        useServerSelection({
          transformedServers: servers,
          initialSelectedServerIds: ['server1'],
          onSelectionChange: mockOnSelectionChange,
        }),
      {
        initialProps: {
          servers: [] as MCPServer[],
        },
      },
    );

    expect(result.current.isInitialLoadComplete).toBe(false);
    expect(result.current.selectedServers).toHaveLength(0);

    // Now provide servers
    rerender({ servers: mockServers });

    expect(result.current.isInitialLoadComplete).toBe(true);
    expect(result.current.selectedServers).toHaveLength(1);
    expect(result.current.selectedServers[0].id).toBe('server1');
  });
});
