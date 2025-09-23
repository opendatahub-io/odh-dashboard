/* eslint-disable camelcase */
import * as React from 'react';
import { useBrowserStorage, Namespace } from 'mod-arch-core';
import { act } from '@testing-library/react';
import { renderHook } from '~/__tests__/unit/testUtils/hooks';
import { MCPContextProvider, useMCPContext } from '~/app/context/MCPContext';
import { useMCPServers } from '~/app/hooks/useMCPServers';
import { getMCPServerTools } from '~/app/services/llamaStackService';
import { MCPServerFromAPI, MCPToolsStatus } from '~/app/types';

// Mock dependencies
jest.mock('~/app/hooks/useMCPServers');
jest.mock('~/app/services/llamaStackService');
jest.mock('mod-arch-core');

const mockUseMCPServers = useMCPServers as jest.MockedFunction<typeof useMCPServers>;
const mockGetMCPServerTools = getMCPServerTools as jest.MockedFunction<typeof getMCPServerTools>;
const mockUseBrowserStorage = useBrowserStorage as jest.MockedFunction<typeof useBrowserStorage>;

describe('MCPContext', () => {
  const mockServers: MCPServerFromAPI[] = [
    {
      name: 'test-server-1',
      url: 'https://test1.example.com',
      transport: 'sse',
      description: 'Test server 1',
      logo: null,
      status: 'healthy',
    },
    {
      name: 'test-server-2',
      url: 'https://test2.example.com',
      transport: 'streamable-http',
      description: 'Test server 2',
      logo: 'https://example.com/logo.png',
      status: 'error',
    },
  ];

  const mockServerStatuses = new Map([
    ['https://test1.example.com', { status: 'connected' as const, message: 'Connected' }],
    ['https://test2.example.com', { status: 'unreachable' as const, message: 'Connection failed' }],
  ]);

  const mockRefresh = jest.fn();
  const mockCheckServerStatus = jest.fn();

  const testNamespace: Namespace = {
    name: 'test-namespace',
    displayName: 'Test Namespace',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default useMCPServers mock
    mockUseMCPServers.mockReturnValue({
      servers: mockServers,
      serversLoaded: true,
      serversLoadError: null,
      serverStatuses: mockServerStatuses,
      statusesLoading: new Set(),
      allStatusesChecked: true,
      refresh: mockRefresh,
      checkServerStatus: mockCheckServerStatus,
    });

    // Default browser storage mock
    mockUseBrowserStorage.mockReturnValue([['server-1', 'server-2'], jest.fn()]);
  });

  describe('MCPContextProvider', () => {
    it('provides context value with correct structure and data', async () => {
      const wrapper: React.FunctionComponent<{ children: React.ReactNode }> = ({ children }) => (
        <MCPContextProvider namespace={testNamespace}>{children}</MCPContextProvider>
      );

      const { result } = renderHook(() => useMCPContext(), { wrapper });

      expect(result.current).toEqual({
        // Data from hooks
        servers: mockServers,
        serversLoaded: true,
        serversLoadError: null,
        serverStatuses: mockServerStatuses,
        statusesLoading: new Set(),
        allStatusesChecked: true,

        // Playground selections
        playgroundSelectedServerIds: ['server-1', 'server-2'],
        saveSelectedServersToPlayground: expect.any(Function),

        // UI state
        selectedServersCount: 0,
        setSelectedServersCount: expect.any(Function),

        // Actions
        refresh: mockRefresh,
        fetchServerTools: expect.any(Function),

        // Token management
        serverTokens: expect.any(Map),
        setServerTokens: expect.any(Function),
        isServerValidated: expect.any(Function),

        // API integration
        getSelectedServersForAPI: expect.any(Function),

        // On-demand status checking
        checkServerStatus: mockCheckServerStatus,
      });
    });

    it('calls useMCPServers with selected project', () => {
      const wrapper: React.FunctionComponent<{ children: React.ReactNode }> = ({ children }) => (
        <MCPContextProvider namespace={testNamespace}>{children}</MCPContextProvider>
      );

      renderHook(() => useMCPContext(), { wrapper });

      expect(mockUseMCPServers).toHaveBeenCalledWith('test-namespace', {
        autoCheckStatuses: false,
      });
    });

    it('uses browser storage with correct key and options', () => {
      const wrapper: React.FunctionComponent<{ children: React.ReactNode }> = ({ children }) => (
        <MCPContextProvider namespace={testNamespace}>{children}</MCPContextProvider>
      );

      renderHook(() => useMCPContext(), { wrapper });

      expect(mockUseBrowserStorage).toHaveBeenCalledWith(
        'gen-ai-playground-servers',
        [],
        true, // jsonify
        true, // use sessionStorage
      );
    });
  });

  describe('useMCPContext hook', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test since we expect an error
      // eslint-disable-next-line no-console
      const originalError = console.error;
      // eslint-disable-next-line no-console
      console.error = jest.fn();

      expect(() => {
        renderHook(() => useMCPContext());
      }).toThrow('useMCPContext must be used within an MCPContextProvider');

      // Restore console.error
      // eslint-disable-next-line no-console
      console.error = originalError;
    });
  });

  describe('saveSelectedServersToPlayground', () => {
    it('calls storage setter with provided server IDs', () => {
      const mockSetStorage = jest.fn();
      mockUseBrowserStorage.mockReturnValue([[], mockSetStorage]);

      const wrapper: React.FunctionComponent<{ children: React.ReactNode }> = ({ children }) => (
        <MCPContextProvider namespace={testNamespace}>{children}</MCPContextProvider>
      );

      const { result } = renderHook(() => useMCPContext(), { wrapper });

      const testServerIds = ['server-a', 'server-b', 'server-c'];
      result.current.saveSelectedServersToPlayground(testServerIds);

      expect(mockSetStorage).toHaveBeenCalledWith(testServerIds);
    });
  });

  describe('fetchServerTools', () => {
    it('calls getMCPServerTools with correct parameters', async () => {
      const mockToolsResponse: MCPToolsStatus = {
        server_url: 'https://test.example.com',
        status: 'success',
        message: 'Tools fetched successfully',
        last_checked: Date.now(),
        server_info: {
          name: 'test-server',
          version: '1.0.0',
          protocol_version: '2024-11-05',
        },
        tools_count: 2,
        tools: [
          { name: 'tool1', description: 'Test tool 1', input_schema: {} },
          { name: 'tool2', description: 'Test tool 2', input_schema: {} },
        ],
      };

      mockGetMCPServerTools.mockResolvedValue(mockToolsResponse);

      const wrapper: React.FunctionComponent<{ children: React.ReactNode }> = ({ children }) => (
        <MCPContextProvider namespace={testNamespace}>{children}</MCPContextProvider>
      );

      const { result } = renderHook(() => useMCPContext(), { wrapper });

      const response = await result.current.fetchServerTools(
        'https://test.example.com',
        'test-bearer-token',
      );

      expect(mockGetMCPServerTools).toHaveBeenCalledWith(
        'test-namespace',
        'https://test.example.com',
        'test-bearer-token',
      );
      expect(response).toEqual(mockToolsResponse);
    });

    it('throws error when no namespace is selected', async () => {
      const wrapper: React.FunctionComponent<{ children: React.ReactNode }> = ({ children }) => (
        <MCPContextProvider namespace={undefined}>{children}</MCPContextProvider>
      );

      const { result } = renderHook(() => useMCPContext(), { wrapper });

      await expect(result.current.fetchServerTools('https://test.example.com')).rejects.toThrow(
        'No namespace selected',
      );
    });

    it('propagates service errors', async () => {
      const serviceError = new Error('Service unavailable');
      mockGetMCPServerTools.mockRejectedValue(serviceError);

      const wrapper: React.FunctionComponent<{ children: React.ReactNode }> = ({ children }) => (
        <MCPContextProvider namespace={testNamespace}>{children}</MCPContextProvider>
      );

      const { result } = renderHook(() => useMCPContext(), { wrapper });

      await expect(result.current.fetchServerTools('https://test.example.com')).rejects.toThrow(
        'Service unavailable',
      );
    });
  });

  describe('selectedServersCount state', () => {
    it('initializes with zero and allows updates', async () => {
      const wrapper: React.FunctionComponent<{ children: React.ReactNode }> = ({ children }) => (
        <MCPContextProvider namespace={testNamespace}>{children}</MCPContextProvider>
      );

      const { result } = renderHook(() => useMCPContext(), { wrapper });

      expect(result.current.selectedServersCount).toBe(0);

      // Update count wrapped in act
      await act(async () => {
        result.current.setSelectedServersCount(5);
      });

      expect(result.current.selectedServersCount).toBe(5);
    });
  });
});
