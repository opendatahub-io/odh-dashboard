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
    mockStartAgent.mockResolvedValue(undefined);
    mockStopAgent.mockResolvedValue(undefined);
    mockOnRefresh.mockResolvedValue(undefined);
  });

  describe('handleStop', () => {
    it('should show stop error when stop mutation fails', async () => {
      mockStopAgent.mockRejectedValue(new Error('Stop failed'));

      const { result } = renderHook(
        () => useAgentLifecycleActions({ runtime, onRefresh: mockOnRefresh }),
        { wrapper },
      );

      await act(async () => {
        await result.current.handleStop();
      });

      expect(mockStopAgent).toHaveBeenCalledWith(
        {},
        { namespace: runtime.namespace, name: runtime.name },
      );
      expect(mockError).toHaveBeenCalledWith('Failed to stop agent deployment', 'Stop failed');
      expect(mockSuccess).not.toHaveBeenCalled();
      expect(mockOnRefresh).not.toHaveBeenCalled();
    });

    it('should resolve after successful stop even when refresh fails', async () => {
      mockOnRefresh.mockRejectedValue(new Error('Refresh failed'));

      const { result } = renderHook(
        () => useAgentLifecycleActions({ runtime, onRefresh: mockOnRefresh }),
        { wrapper },
      );

      await act(async () => {
        await result.current.handleStop();
      });

      expect(mockStopAgent).toHaveBeenCalledWith(
        {},
        { namespace: runtime.namespace, name: runtime.name },
      );
      expect(mockSuccess).toHaveBeenCalledWith(
        'Agent deployment stopped',
        `${runtime.name} has been stopped.`,
      );
      expect(mockError).toHaveBeenCalledWith(
        'Failed to refresh agent deployment list',
        'Refresh failed',
      );
      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });

    it('should resolve after successful stop and refresh', async () => {
      const { result } = renderHook(
        () => useAgentLifecycleActions({ runtime, onRefresh: mockOnRefresh }),
        { wrapper },
      );

      await act(async () => {
        await result.current.handleStop();
      });

      expect(mockSuccess).toHaveBeenCalledWith(
        'Agent deployment stopped',
        `${runtime.name} has been stopped.`,
      );
      expect(mockError).not.toHaveBeenCalled();
      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleRestart', () => {
    it('should show restart error when start mutation fails', async () => {
      mockStartAgent.mockRejectedValue(new Error('Start failed'));

      const { result } = renderHook(
        () => useAgentLifecycleActions({ runtime, onRefresh: mockOnRefresh }),
        { wrapper },
      );

      await act(async () => {
        await result.current.handleRestart();
      });

      expect(mockStopAgent).toHaveBeenCalledWith(
        {},
        { namespace: runtime.namespace, name: runtime.name },
      );
      expect(mockStartAgent).toHaveBeenCalledWith(
        {},
        { namespace: runtime.namespace, name: runtime.name },
      );
      expect(mockError).toHaveBeenCalledWith('Failed to restart agent deployment', 'Start failed');
      expect(mockSuccess).not.toHaveBeenCalled();
      expect(mockOnRefresh).not.toHaveBeenCalled();
    });

    it('should show restart error when stop mutation fails', async () => {
      mockStopAgent.mockRejectedValue(new Error('Stop failed'));

      const { result } = renderHook(
        () => useAgentLifecycleActions({ runtime, onRefresh: mockOnRefresh }),
        { wrapper },
      );

      await act(async () => {
        await result.current.handleRestart();
      });

      expect(mockStopAgent).toHaveBeenCalledWith(
        {},
        { namespace: runtime.namespace, name: runtime.name },
      );
      expect(mockStartAgent).not.toHaveBeenCalled();
      expect(mockError).toHaveBeenCalledWith('Failed to restart agent deployment', 'Stop failed');
      expect(mockSuccess).not.toHaveBeenCalled();
      expect(mockOnRefresh).not.toHaveBeenCalled();
    });

    it('should resolve after successful restart even when refresh fails', async () => {
      mockOnRefresh.mockRejectedValue(new Error('Refresh failed'));

      const { result } = renderHook(
        () => useAgentLifecycleActions({ runtime, onRefresh: mockOnRefresh }),
        { wrapper },
      );

      await act(async () => {
        await result.current.handleRestart();
      });

      expect(mockStopAgent).toHaveBeenCalledWith(
        {},
        { namespace: runtime.namespace, name: runtime.name },
      );
      expect(mockStartAgent).toHaveBeenCalledWith(
        {},
        { namespace: runtime.namespace, name: runtime.name },
      );
      expect(mockSuccess).toHaveBeenCalledWith(
        'Agent deployment restarted',
        `${runtime.name} is restarting.`,
      );
      expect(mockError).toHaveBeenCalledWith(
        'Failed to refresh agent deployment list',
        'Refresh failed',
      );
      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });

    it('should keep isPending true between stop and start during restart', async () => {
      let resolveStop: (value?: void) => void = () => undefined;
      let resolveStart: (value?: void) => void = () => undefined;
      const stopPromise = new Promise<void>((resolve) => {
        resolveStop = resolve;
      });
      const startPromise = new Promise<void>((resolve) => {
        resolveStart = resolve;
      });
      mockStopAgent.mockReturnValue(stopPromise);
      mockStartAgent.mockReturnValue(startPromise);

      const { result } = renderHook(
        () => useAgentLifecycleActions({ runtime, onRefresh: mockOnRefresh }),
        { wrapper },
      );

      let restartPromise: Promise<void> | undefined;
      act(() => {
        restartPromise = result.current.handleRestart();
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isPending).toBe(true);

      await act(async () => {
        resolveStop();
        await stopPromise;
        await Promise.resolve();
      });

      expect(result.current.isPending).toBe(true);
      expect(mockStartAgent).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveStart();
        await startPromise;
        await restartPromise;
      });

      expect(result.current.isPending).toBe(false);
    });

    it('should ignore concurrent restart requests', async () => {
      let resolveStop: (value?: void) => void = () => undefined;
      const stopPromise = new Promise<void>((resolve) => {
        resolveStop = resolve;
      });
      mockStopAgent.mockReturnValue(stopPromise);

      const { result } = renderHook(
        () => useAgentLifecycleActions({ runtime, onRefresh: mockOnRefresh }),
        { wrapper },
      );

      act(() => {
        void result.current.handleRestart();
        void result.current.handleRestart();
      });

      await act(async () => {
        resolveStop();
        await stopPromise;
        await Promise.resolve();
      });

      expect(mockStopAgent).toHaveBeenCalledTimes(1);
    });

    it('should resolve after successful restart and refresh', async () => {
      const { result } = renderHook(
        () => useAgentLifecycleActions({ runtime, onRefresh: mockOnRefresh }),
        { wrapper },
      );

      await act(async () => {
        await result.current.handleRestart();
      });

      expect(mockSuccess).toHaveBeenCalledWith(
        'Agent deployment restarted',
        `${runtime.name} is restarting.`,
      );
      expect(mockError).not.toHaveBeenCalled();
      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });
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
