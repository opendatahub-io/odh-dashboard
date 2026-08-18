import { useQueryClient } from '@tanstack/react-query';
import React from 'react';
import {
  useDeletePipelineRunMutation,
  useRetryPipelineRunMutation,
  useTerminatePipelineRunMutation,
} from '~/app/hooks/mutations';
import { useNotification } from '~/app/hooks/useNotification';
import {
  AUTORAG_FAILURE_CATEGORY,
  fireAutoragExperimentDeleted,
  fireAutoragRunRetried,
  fireAutoragRunStopped,
  TrackingOutcome,
  type RunActionSource,
} from '~/app/utilities/tracking';

type AutoragRunActions = {
  handleRetry: () => Promise<void>;
  handleConfirmStop: () => Promise<void>;
  handleDelete: () => Promise<void>;
  isRetrying: boolean;
  isTerminating: boolean;
  isDeleting: boolean;
};

/**
 * Encapsulates retry, stop (terminate), and delete actions for a pipeline run,
 * including mutation state and toast notifications.
 */
export const useAutoragRunActions = (
  namespace: string,
  runId: string,
  source: RunActionSource,
  onActionComplete?: () => void | Promise<void>,
): AutoragRunActions => {
  const queryClient = useQueryClient();
  const notification = useNotification();
  const retryMutation = useRetryPipelineRunMutation(namespace, runId);
  const terminateMutation = useTerminatePipelineRunMutation(namespace, runId);
  const deleteMutation = useDeletePipelineRunMutation(namespace, runId);

  const handleRetry = React.useCallback(async () => {
    try {
      await retryMutation.mutateAsync();
      await queryClient.invalidateQueries({
        queryKey: ['autorag', 'pipelineRun', runId, namespace],
      });
      notification.success(
        'Retry submitted successfully',
        'The process is asynchronous and may take some time to take effect',
      );
      fireAutoragRunRetried({ outcome: TrackingOutcome.submit, success: true, source });
    } catch (error) {
      notification.error(
        'Failed to retry run',
        error instanceof Error ? error.message : 'An unknown error occurred',
      );
      fireAutoragRunRetried({
        outcome: TrackingOutcome.submit,
        success: false,
        error: AUTORAG_FAILURE_CATEGORY,
        source,
      });
      throw error;
    }
    try {
      await onActionComplete?.();
    } catch {
      // Caller refresh failure should not mask a successful retry.
    }
  }, [retryMutation, queryClient, runId, namespace, onActionComplete, notification, source]);

  const handleConfirmStop = React.useCallback(async () => {
    try {
      await terminateMutation.mutateAsync();
      await queryClient.invalidateQueries({
        queryKey: ['autorag', 'pipelineRun', runId, namespace],
      });
      notification.success(
        'Stop submitted successfully',
        'The process is asynchronous and may take some time to take effect',
      );
      fireAutoragRunStopped({ outcome: TrackingOutcome.submit, success: true, source });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      // Check if the error is because the run is already in a terminal state (case-insensitive, whole words only)
      const terminalStatePattern = /\b(FAILED|SUCCEEDED|CANCELL?ED)\b|cannot be terminated/i;
      const isAlreadyTerminated = terminalStatePattern.test(errorMessage);

      if (isAlreadyTerminated) {
        notification.warning(
          'Run already finished',
          'The pipeline run has already completed or failed. The page will refresh to show the current state.',
        );
      } else {
        notification.error('Failed to stop run', errorMessage);
      }
      fireAutoragRunStopped({
        outcome: TrackingOutcome.submit,
        success: false,
        error: AUTORAG_FAILURE_CATEGORY,
        source,
      });
      // Refresh the state to update the UI (don't let refresh failure mask the original error)
      try {
        await queryClient.invalidateQueries({
          queryKey: ['autorag', 'pipelineRun', runId, namespace],
        });
      } catch {
        // Ignore refresh failure
      }
      throw error;
    }
    try {
      await onActionComplete?.();
    } catch {
      // Caller refresh failure should not mask a successful stop.
    }
  }, [terminateMutation, queryClient, runId, namespace, onActionComplete, notification, source]);

  const handleDelete = React.useCallback(async () => {
    try {
      await deleteMutation.mutateAsync();
      await queryClient.invalidateQueries({
        queryKey: ['autorag', 'pipelineRun', runId, namespace],
      });
      notification.success(
        'Run deleted successfully',
        'The pipeline run has been permanently removed',
      );
      fireAutoragExperimentDeleted({ outcome: TrackingOutcome.submit, success: true, source });
    } catch (error) {
      notification.error(
        'Failed to delete run',
        error instanceof Error ? error.message : 'An unknown error occurred',
      );
      fireAutoragExperimentDeleted({
        outcome: TrackingOutcome.submit,
        success: false,
        error: AUTORAG_FAILURE_CATEGORY,
        source,
      });
      throw error;
    }
    try {
      await onActionComplete?.();
    } catch {
      // Caller refresh failure should not mask a successful delete.
    }
  }, [deleteMutation, queryClient, runId, namespace, onActionComplete, notification, source]);

  return {
    handleRetry,
    handleConfirmStop,
    handleDelete,
    isRetrying: retryMutation.isPending,
    isTerminating: terminateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
