import * as React from 'react';
import { renderHook, act } from '@testing-library/react';
import {
  MCPSelectionContextProvider,
  useMCPSelectionContext,
} from '~/app/context/MCPSelectionContext';

// Mock the browser storage hook
jest.mock('mod-arch-core', () => ({
  useBrowserStorage: jest.fn(),
  asEnumMember: jest.fn(),
  DeploymentMode: {
    Federated: 'federated',
    Standalone: 'standalone',
  },
}));

// Mock the constants file
jest.mock('~/app/utilities/const', () => ({
  MCP_SERVERS_SESSION_STORAGE_KEY: 'gen-ai-playground-servers',
}));

const mockUseBrowserStorage = jest.mocked(
  jest.requireMock('mod-arch-core').useBrowserStorage,
) as jest.MockedFunction<
  (key: string, defaultValue: string[]) => [string[], (value: string[]) => void]
>;

describe('MCPSelectionContext', () => {
  const mockSetPlaygroundSelectedServerIds = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBrowserStorage.mockReturnValue([[], mockSetPlaygroundSelectedServerIds]);
  });

  describe('MCPSelectionContextProvider', () => {
    it('should provide default values', () => {
      const wrapper: React.FunctionComponent<{ children: React.ReactNode }> = ({ children }) => (
        <MCPSelectionContextProvider>{children}</MCPSelectionContextProvider>
      );

      const { result } = renderHook(() => useMCPSelectionContext(), { wrapper });

      expect(result.current.playgroundSelectedServerIds).toEqual([]);
      expect(result.current.selectedServersCount).toBe(0);
      expect(result.current.saveSelectedServersToPlayground).toBeDefined();
      expect(result.current.setSelectedServersCount).toBeDefined();
    });

    it('should save selected servers to playground', () => {
      const wrapper: React.FunctionComponent<{ children: React.ReactNode }> = ({ children }) => (
        <MCPSelectionContextProvider>{children}</MCPSelectionContextProvider>
      );

      const { result } = renderHook(() => useMCPSelectionContext(), { wrapper });

      act(() => {
        result.current.saveSelectedServersToPlayground(['server1', 'server2']);
      });

      expect(mockSetPlaygroundSelectedServerIds).toHaveBeenCalledWith(['server1', 'server2']);
    });

    it('should update selected servers count', () => {
      const wrapper: React.FunctionComponent<{ children: React.ReactNode }> = ({ children }) => (
        <MCPSelectionContextProvider>{children}</MCPSelectionContextProvider>
      );

      const { result } = renderHook(() => useMCPSelectionContext(), { wrapper });

      act(() => {
        result.current.setSelectedServersCount(5);
      });

      expect(result.current.selectedServersCount).toBe(5);
    });
  });

  describe('useMCPSelectionContext hook', () => {
    it('should throw error when used outside provider', () => {
      expect(() => {
        renderHook(() => useMCPSelectionContext());
      }).toThrow('useMCPSelectionContext must be used within an MCPSelectionContextProvider');
    });
  });
});
