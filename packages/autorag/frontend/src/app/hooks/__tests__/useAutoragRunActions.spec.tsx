import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAutoragRunActions } from '~/app/hooks/useAutoragRunActions';
import {
  AUTORAG_FAILURE_CATEGORY,
  fireAutoragExperimentDeleted,
  fireAutoragRunRetried,
  fireAutoragRunStopped,
} from '~/app/utilities/tracking';

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

jest.mock('~/app/utilities/tracking', () => ({
  ...jest.requireActual('~/app/utilities/tracking'),
  fireAutoragRunStopped: jest.fn(),
  fireAutoragRunRetried: jest.fn(),
  fireAutoragExperimentDeleted: jest.fn(),
}));

const fireAutoragRunStoppedMock = jest.mocked(fireAutoragRunStopped);
const fireAutoragRunRetriedMock = jest.mocked(fireAutoragRunRetried);
const fireAutoragExperimentDeletedMock = jest.mocked(fireAutoragExperimentDeleted);

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
    it('should show success notification and fire success: true on successful stop', async () => {
      const { result } = renderHook(() => useAutoragRunActions('test-ns', 'run-123', 'runsList'), {
        wrapper,
      });

      await act(async () => {
        await result.current.handleConfirmStop();
      });

      expect(mockNotification.success).toHaveBeenCalledWith(
        'Stop submitted successfully',
        'The process is asynchronous and may take some time to take effect',
      );
      expect(fireAutoragRunStoppedMock).toHaveBeenCalledWith({
        outcome: 'submit',
        success: true,
        source: 'runsList',
      });
    });

    it('should show warning notification when run is already in terminal state, but still fire success: false with the allowlisted category', async () => {
      const mockMutateAsync = jest
        .fn()
        .mockRejectedValue(new Error('run is in state FAILED and cannot be terminated'));
      const { useTerminatePipelineRunMutation } = jest.requireMock('~/app/hooks/mutations');
      useTerminatePipelineRunMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      const { result } = renderHook(() => useAutoragRunActions('test-ns', 'run-123', 'runsList'), {
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
      expect(fireAutoragRunStoppedMock).toHaveBeenCalledWith({
        outcome: 'submit',
        success: false,
        error: AUTORAG_FAILURE_CATEGORY,
        source: 'runsList',
      });
    });

    it('should show error notification for other errors, and fire the allowlisted failure category rather than the raw error message', async () => {
      const errorMessage =
        'Network error (403): AccessDenied for tenant acme-corp using key AKIAabc123';
      const mockMutateAsync = jest.fn().mockRejectedValue(new Error(errorMessage));
      const { useTerminatePipelineRunMutation } = jest.requireMock('~/app/hooks/mutations');
      useTerminatePipelineRunMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      const { result } = renderHook(
        () => useAutoragRunActions('test-ns', 'run-123', 'resultsPage'),
        {
          wrapper,
        },
      );

      await act(async () => {
        await expect(result.current.handleConfirmStop()).rejects.toThrow();
      });

      expect(mockNotification.error).toHaveBeenCalledWith('Failed to stop run', errorMessage);
      expect(mockNotification.warning).not.toHaveBeenCalled();
      // The in-product notification may keep the detailed message, but analytics must only
      // ever see the fixed, allowlisted category.
      expect(fireAutoragRunStoppedMock).toHaveBeenCalledWith({
        outcome: 'submit',
        success: false,
        error: AUTORAG_FAILURE_CATEGORY,
        source: 'resultsPage',
      });
      const allTrackingCalls = JSON.stringify(fireAutoragRunStoppedMock.mock.calls);
      expect(allTrackingCalls).not.toContain('acme-corp');
      expect(allTrackingCalls).not.toContain('AKIAabc123');
    });
  });

  describe('handleRetry', () => {
    it('should show success notification and fire success: true on successful retry', async () => {
      const { result } = renderHook(() => useAutoragRunActions('test-ns', 'run-123', 'runsList'), {
        wrapper,
      });

      await act(async () => {
        await result.current.handleRetry();
      });

      expect(mockNotification.success).toHaveBeenCalledWith(
        'Retry submitted successfully',
        'The process is asynchronous and may take some time to take effect',
      );
      expect(fireAutoragRunRetriedMock).toHaveBeenCalledWith({
        outcome: 'submit',
        success: true,
        source: 'runsList',
      });
    });

    it('should show error notification when retry fails, and fire the allowlisted failure category rather than the raw error message', async () => {
      const errorMessage =
        'Network error (403): AccessDenied for tenant acme-corp using key AKIAabc123';
      const mockMutateAsync = jest.fn().mockRejectedValue(new Error(errorMessage));
      const { useRetryPipelineRunMutation } = jest.requireMock('~/app/hooks/mutations');
      useRetryPipelineRunMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      const { result } = renderHook(
        () => useAutoragRunActions('test-ns', 'run-123', 'resultsPage'),
        {
          wrapper,
        },
      );

      await act(async () => {
        await expect(result.current.handleRetry()).rejects.toThrow();
      });

      expect(mockNotification.error).toHaveBeenCalledWith('Failed to retry run', errorMessage);
      // The in-product notification may keep the detailed message, but analytics must only
      // ever see the fixed, allowlisted category.
      expect(fireAutoragRunRetriedMock).toHaveBeenCalledWith({
        outcome: 'submit',
        success: false,
        error: AUTORAG_FAILURE_CATEGORY,
        source: 'resultsPage',
      });
      const allTrackingCalls = JSON.stringify(fireAutoragRunRetriedMock.mock.calls);
      expect(allTrackingCalls).not.toContain('acme-corp');
      expect(allTrackingCalls).not.toContain('AKIAabc123');
    });
  });

  describe('handleDelete', () => {
    it('should show success notification and fire success: true on successful delete', async () => {
      const { result } = renderHook(() => useAutoragRunActions('test-ns', 'run-123', 'runsList'), {
        wrapper,
      });

      await act(async () => {
        await result.current.handleDelete();
      });

      expect(mockNotification.success).toHaveBeenCalledWith(
        'Run deleted successfully',
        'The pipeline run has been permanently removed',
      );
      expect(fireAutoragExperimentDeletedMock).toHaveBeenCalledWith({
        outcome: 'submit',
        success: true,
        source: 'runsList',
      });
    });

    it('should show error notification when delete fails, and fire the allowlisted failure category rather than the raw error message', async () => {
      const errorMessage =
        'Network error (403): AccessDenied for tenant acme-corp using key AKIAabc123';
      const mockMutateAsync = jest.fn().mockRejectedValue(new Error(errorMessage));
      const { useDeletePipelineRunMutation } = jest.requireMock('~/app/hooks/mutations');
      useDeletePipelineRunMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      const { result } = renderHook(
        () => useAutoragRunActions('test-ns', 'run-123', 'resultsPage'),
        {
          wrapper,
        },
      );

      await act(async () => {
        await expect(result.current.handleDelete()).rejects.toThrow();
      });

      expect(mockNotification.error).toHaveBeenCalledWith('Failed to delete run', errorMessage);
      // The in-product notification may keep the detailed message, but analytics must only
      // ever see the fixed, allowlisted category.
      expect(fireAutoragExperimentDeletedMock).toHaveBeenCalledWith({
        outcome: 'submit',
        success: false,
        error: AUTORAG_FAILURE_CATEGORY,
        source: 'resultsPage',
      });
      const allTrackingCalls = JSON.stringify(fireAutoragExperimentDeletedMock.mock.calls);
      expect(allTrackingCalls).not.toContain('acme-corp');
      expect(allTrackingCalls).not.toContain('AKIAabc123');
    });
  });
});
