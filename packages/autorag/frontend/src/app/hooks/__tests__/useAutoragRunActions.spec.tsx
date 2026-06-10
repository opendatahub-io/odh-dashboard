import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAutoragRunActions } from '~/app/hooks/useAutoragRunActions';

const mockNotification = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
};

jest.mock('~/app/hooks/mutations', () => ({
  useTerminatePipelineRunMutation: jest.fn().mockReturnValue({
    mutateAsync: jest.fn().mockResolvedValue(undefined),
    isPending: false,
  }),
  useRetryPipelineRunMutation: jest.fn().mockReturnValue({
    mutateAsync: jest.fn().mockResolvedValue(undefined),
    isPending: false,
  }),
  useDeletePipelineRunMutation: jest.fn().mockReturnValue({
    mutateAsync: jest.fn().mockResolvedValue(undefined),
    isPending: false,
  }),
}));

jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: () => mockNotification,
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
);

describe('useAutoragRunActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks to default successful behavior
    const { useRetryPipelineRunMutation, useTerminatePipelineRunMutation } =
      jest.requireMock('~/app/hooks/mutations');
    useRetryPipelineRunMutation.mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue(undefined),
      isPending: false,
    });
    useTerminatePipelineRunMutation.mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue(undefined),
      isPending: false,
    });
  });

  describe('handleConfirmStop', () => {
    it('should show success notification on successful stop', async () => {
      const { result } = renderHook(() => useAutoragRunActions('test-ns', 'run-123'), {
        wrapper,
      });

      await act(async () => {
        await result.current.handleConfirmStop();
      });

      expect(mockNotification.success).toHaveBeenCalledWith(
        'Stop submitted successfully',
        'The process is asynchronous and may take some time to take effect',
      );
    });

    it('should show warning notification when run is already in terminal state', async () => {
      const mockMutateAsync = jest
        .fn()
        .mockRejectedValue(new Error('run is in state FAILED and cannot be terminated'));
      const { useTerminatePipelineRunMutation } = jest.requireMock('~/app/hooks/mutations');
      useTerminatePipelineRunMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      const { result } = renderHook(() => useAutoragRunActions('test-ns', 'run-123'), {
        wrapper,
      });

      await act(async () => {
        await expect(result.current.handleConfirmStop()).rejects.toThrow();
      });

      expect(mockNotification.warning).toHaveBeenCalledWith(
        'Run already finished',
        'The pipeline run has already completed or failed. The page will refresh to show the current state.',
      );
      expect(mockNotification.error).not.toHaveBeenCalled();
    });

    it('should show error notification for other errors', async () => {
      const mockMutateAsync = jest.fn().mockRejectedValue(new Error('Network error'));
      const { useTerminatePipelineRunMutation } = jest.requireMock('~/app/hooks/mutations');
      useTerminatePipelineRunMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      const { result } = renderHook(() => useAutoragRunActions('test-ns', 'run-123'), {
        wrapper,
      });

      await act(async () => {
        await expect(result.current.handleConfirmStop()).rejects.toThrow();
      });

      expect(mockNotification.error).toHaveBeenCalledWith('Failed to stop run', 'Network error');
      expect(mockNotification.warning).not.toHaveBeenCalled();
    });
  });

  describe('handleRetry', () => {
    it('should show success notification on successful retry', async () => {
      const { result } = renderHook(() => useAutoragRunActions('test-ns', 'run-123'), {
        wrapper,
      });

      await act(async () => {
        await result.current.handleRetry();
      });

      expect(mockNotification.success).toHaveBeenCalledWith(
        'Retry submitted successfully',
        'The process is asynchronous and may take some time to take effect',
      );
    });

    it('should show error notification when retry fails', async () => {
      const mockMutateAsync = jest.fn().mockRejectedValue(new Error('Retry failed'));
      const { useRetryPipelineRunMutation } = jest.requireMock('~/app/hooks/mutations');
      useRetryPipelineRunMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      const { result } = renderHook(() => useAutoragRunActions('test-ns', 'run-123'), {
        wrapper,
      });

      await act(async () => {
        await expect(result.current.handleRetry()).rejects.toThrow();
      });

      expect(mockNotification.error).toHaveBeenCalledWith('Failed to retry run', 'Retry failed');
    });
  });
});
