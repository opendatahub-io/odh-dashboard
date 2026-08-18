import { useQueryClient } from '@tanstack/react-query';
import { act } from '@testing-library/react';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import {
  useDeletePipelineRunMutation,
  useRetryPipelineRunMutation,
  useTerminatePipelineRunMutation,
} from '~/app/hooks/mutations';
import { useNotification } from '~/app/hooks/useNotification';
import { useAutomlRunActions } from '~/app/hooks/useAutomlRunActions';
import {
  AUTOML_FAILURE_CATEGORY,
  fireAutomlRunDeleted,
  fireAutomlRunRetried,
  fireAutomlRunStopped,
} from '~/app/utilities/tracking';

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn(),
}));

jest.mock('~/app/hooks/mutations', () => ({
  useRetryPipelineRunMutation: jest.fn(),
  useTerminatePipelineRunMutation: jest.fn(),
  useDeletePipelineRunMutation: jest.fn(),
}));

jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: jest.fn(),
}));

jest.mock('~/app/utilities/tracking', () => ({
  ...jest.requireActual('~/app/utilities/tracking'),
  fireAutomlRunRetried: jest.fn(),
  fireAutomlRunStopped: jest.fn(),
  fireAutomlRunDeleted: jest.fn(),
}));

const useQueryClientMock = jest.mocked(useQueryClient);
const useRetryPipelineRunMutationMock = jest.mocked(useRetryPipelineRunMutation);
const useTerminatePipelineRunMutationMock = jest.mocked(useTerminatePipelineRunMutation);
const useDeletePipelineRunMutationMock = jest.mocked(useDeletePipelineRunMutation);
const useNotificationMock = jest.mocked(useNotification);
const fireAutomlRunRetriedMock = jest.mocked(fireAutomlRunRetried);
const fireAutomlRunStoppedMock = jest.mocked(fireAutomlRunStopped);
const fireAutomlRunDeletedMock = jest.mocked(fireAutomlRunDeleted);

const SENSITIVE_ERROR_MESSAGE =
  'Failed to delete run (403): AccessDenied for tenant acme-corp using key AKIAabc123';

describe('useAutomlRunActions', () => {
  const notificationError = jest.fn();
  const notificationSuccess = jest.fn();
  const invalidateQueries = jest.fn().mockResolvedValue(undefined);

  const retryMutateAsync = jest.fn();
  const terminateMutateAsync = jest.fn();
  const deleteMutateAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    invalidateQueries.mockResolvedValue(undefined);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useQueryClientMock.mockReturnValue({ invalidateQueries } as any);
    useNotificationMock.mockReturnValue({
      success: notificationSuccess,
      error: notificationError,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useRetryPipelineRunMutationMock.mockReturnValue({ mutateAsync: retryMutateAsync } as any);
    useTerminatePipelineRunMutationMock.mockReturnValue({
      mutateAsync: terminateMutateAsync,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useDeletePipelineRunMutationMock.mockReturnValue({ mutateAsync: deleteMutateAsync } as any);
  });

  describe('handleRetry', () => {
    it('should fire the allowlisted failure category, not the raw error message, on failure', async () => {
      retryMutateAsync.mockRejectedValue(new Error(SENSITIVE_ERROR_MESSAGE));
      const renderResult = testHook(useAutomlRunActions)('test-ns', 'run-1', 'runsList');

      await act(async () => {
        await expect(renderResult.result.current.handleRetry()).rejects.toThrow();
      });

      // The in-product notification may keep the detailed message...
      expect(notificationError).toHaveBeenCalledWith(
        'Failed to retry run',
        SENSITIVE_ERROR_MESSAGE,
      );
      // ...but analytics must only ever see the fixed, allowlisted category.
      expect(fireAutomlRunRetriedMock).toHaveBeenCalledWith({
        outcome: 'submit',
        success: false,
        error: AUTOML_FAILURE_CATEGORY,
        source: 'runsList',
      });
      const allTrackingCalls = JSON.stringify(fireAutomlRunRetriedMock.mock.calls);
      expect(allTrackingCalls).not.toContain('acme-corp');
      expect(allTrackingCalls).not.toContain('AKIAabc123');
    });
  });

  describe('handleConfirmStop', () => {
    it('should fire the allowlisted failure category, not the raw error message, on failure', async () => {
      terminateMutateAsync.mockRejectedValue(new Error(SENSITIVE_ERROR_MESSAGE));
      const renderResult = testHook(useAutomlRunActions)('test-ns', 'run-1', 'runsList');

      await act(async () => {
        await expect(renderResult.result.current.handleConfirmStop()).rejects.toThrow();
      });

      expect(notificationError).toHaveBeenCalledWith('Failed to stop run', SENSITIVE_ERROR_MESSAGE);
      expect(fireAutomlRunStoppedMock).toHaveBeenCalledWith({
        outcome: 'submit',
        success: false,
        error: AUTOML_FAILURE_CATEGORY,
        source: 'runsList',
      });
      const allTrackingCalls = JSON.stringify(fireAutomlRunStoppedMock.mock.calls);
      expect(allTrackingCalls).not.toContain('acme-corp');
      expect(allTrackingCalls).not.toContain('AKIAabc123');
    });
  });

  describe('handleDelete', () => {
    it('should fire the allowlisted failure category, not the raw error message, on failure', async () => {
      deleteMutateAsync.mockRejectedValue(new Error(SENSITIVE_ERROR_MESSAGE));
      const renderResult = testHook(useAutomlRunActions)('test-ns', 'run-1', 'runsList');

      await act(async () => {
        await expect(renderResult.result.current.handleDelete()).rejects.toThrow();
      });

      expect(notificationError).toHaveBeenCalledWith(
        'Failed to delete run',
        SENSITIVE_ERROR_MESSAGE,
      );
      expect(fireAutomlRunDeletedMock).toHaveBeenCalledWith({
        outcome: 'submit',
        success: false,
        error: AUTOML_FAILURE_CATEGORY,
        source: 'runsList',
      });
      const allTrackingCalls = JSON.stringify(fireAutomlRunDeletedMock.mock.calls);
      expect(allTrackingCalls).not.toContain('acme-corp');
      expect(allTrackingCalls).not.toContain('AKIAabc123');
    });
  });
});
