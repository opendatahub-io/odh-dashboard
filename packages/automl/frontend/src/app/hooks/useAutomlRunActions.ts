import { useQueryClient } from '@tanstack/react-query';
import React from 'react';
import {
  useDeletePipelineRunMutation,
  useRetryPipelineRunMutation,
  useTerminatePipelineRunMutation,
} from '~/app/hooks/mutations';
import { useNotification } from '~/app/hooks/useNotification';
import {
  AUTOML_FAILURE_CATEGORY,
  fireAutomlRunDeleted,
  fireAutomlRunRetried,
  fireAutomlRunStopped,
  TrackingOutcome,
  type RunActionSource,
} from '~/app/utilities/tracking';

type AutomlRunActions = {
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
export const useAutomlRunActions = (
  namespace: string,
  runId: string,
  source: RunActionSource,
  onActionComplete?: () => void | Promise<void>,
): AutomlRunActions => {
  const queryClient = useQueryClient();
  const notification = useNotification();
  const retryMutation = useRetryPipelineRunMutation(namespace, runId);
  const terminateMutation = useTerminatePipelineRunMutation(namespace, runId);
  const deleteMutation = useDeletePipelineRunMutation(namespace, runId);

  const handleRetry = React.useCallback(async () => {
    try {
      await retryMutation.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: ['pipelineRun', runId, namespace] });
      notification.success(
        'Retry submitted successfully',
        'The process is asynchronous and may take some time to take effect',
      );
      fireAutomlRunRetried({ outcome: TrackingOutcome.submit, success: true, source });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      notification.error('Failed to retry run', errorMessage);
      fireAutomlRunRetried({
        outcome: TrackingOutcome.submit,
        success: false,
        error: AUTOML_FAILURE_CATEGORY,
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
      await queryClient.invalidateQueries({ queryKey: ['pipelineRun', runId, namespace] });
      notification.success(
        'Stop submitted successfully',
        'The process is asynchronous and may take some time to take effect',
      );
      fireAutomlRunStopped({ outcome: TrackingOutcome.submit, success: true, source });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      notification.error('Failed to stop run', errorMessage);
      fireAutomlRunStopped({
        outcome: TrackingOutcome.submit,
        success: false,
        error: AUTOML_FAILURE_CATEGORY,
        source,
      });
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
      await queryClient.invalidateQueries({ queryKey: ['pipelineRun', runId, namespace] });
      notification.success(
        'Run deleted successfully',
        'The pipeline run has been permanently removed',
      );
      fireAutomlRunDeleted({ outcome: TrackingOutcome.submit, success: true, source });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      notification.error('Failed to delete run', errorMessage);
      fireAutomlRunDeleted({
        outcome: TrackingOutcome.submit,
        success: false,
        error: AUTOML_FAILURE_CATEGORY,
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
