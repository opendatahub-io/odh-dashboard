import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { act, renderHook } from '@testing-library/react';
import { mockAgentRuntime } from '~/__mocks__/mockAgentRuntime';
import { useAgentLifecycleActions } from '~/app/hooks/useAgentLifecycleActions';

const mockDeleteAgent = jest.fn();
const mockStartAgent = jest.fn();
const mockStopAgent = jest.fn();
const mockSuccess = jest.fn();
const mockError = jest.fn();
const mockOnRefresh = jest.fn();

jest.mock('~/app/api/agentLifecycle', () => ({
  deleteAgent: () => (opts: unknown, params: unknown) => mockDeleteAgent(opts, params),
  startAgent: () => (opts: unknown, params: unknown) => mockStartAgent(opts, params),
  stopAgent: () => (opts: unknown, params: unknown) => mockStopAgent(opts, params),
}));

jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: () => ({
    success: mockSuccess,
    error: mockError,
    info: jest.fn(),
    warning: jest.fn(),
    remove: jest.fn(),
  }),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const runtime = mockAgentRuntime({
  name: 'sample-support-agent',
  namespace: 'agent-ops-demo',
  status: 'Ready',
});

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: createTestQueryClient() }, children);

describe('useAgentLifecycleActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteAgent.mockResolvedValue(undefined);
    mockOnRefresh.mockResolvedValue(undefined);
  });

  describe('handleDelete', () => {
    it('should reject when delete mutation fails', async () => {
      mockDeleteAgent.mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(
        () => useAgentLifecycleActions({ runtime, onRefresh: mockOnRefresh }),
        { wrapper },
      );

      await expect(result.current.handleDelete()).rejects.toThrow('Delete failed');

      expect(mockError).toHaveBeenCalledWith('Failed to delete agent deployment', 'Delete failed');
      expect(mockSuccess).not.toHaveBeenCalled();
      expect(mockOnRefresh).not.toHaveBeenCalled();
    });

    it('should resolve after successful delete even when refresh fails', async () => {
      mockOnRefresh.mockRejectedValue(new Error('Refresh failed'));

      const { result } = renderHook(
        () => useAgentLifecycleActions({ runtime, onRefresh: mockOnRefresh }),
        { wrapper },
      );

      await act(async () => {
        await result.current.handleDelete();
      });

      expect(mockDeleteAgent).toHaveBeenCalledWith(
        {},
        { namespace: runtime.namespace, name: runtime.name },
      );
      expect(mockSuccess).toHaveBeenCalledWith(
        'Agent deployment deleted',
        `${runtime.name} has been deleted.`,
      );
      expect(mockError).toHaveBeenCalledWith(
        'Failed to refresh agent deployment list',
        'Refresh failed',
      );
      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });

    it('should resolve after successful delete and refresh', async () => {
      const { result } = renderHook(
        () => useAgentLifecycleActions({ runtime, onRefresh: mockOnRefresh }),
        { wrapper },
      );

      await act(async () => {
        await result.current.handleDelete();
      });

      expect(mockSuccess).toHaveBeenCalledWith(
        'Agent deployment deleted',
        `${runtime.name} has been deleted.`,
      );
      expect(mockError).not.toHaveBeenCalled();
      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });
  });
});
