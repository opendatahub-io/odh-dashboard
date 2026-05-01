import { useQueryClient } from '@tanstack/react-query';
import React from 'react';
import {
  useDeletePipelineRunMutation,
  useRetryPipelineRunMutation,
  useTerminatePipelineRunMutation,
} from '~/app/hooks/mutations';
import { useNotification } from '~/app/hooks/useNotification';

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
    } catch (error) {
      notification.error(
        'Failed to retry run',
        error instanceof Error ? error.message : 'An unknown error occurred',
      );
      return;
    }
    try {
      await onActionComplete?.();
    } catch {
      // Caller refresh failure should not mask a successful retry.
    }
  }, [retryMutation, queryClient, runId, namespace, onActionComplete, notification]);

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
    } catch (error) {
      notification.error(
        'Failed to stop run',
        error instanceof Error ? error.message : 'An unknown error occurred',
      );
      return;
    }
    try {
      await onActionComplete?.();
    } catch {
      // Caller refresh failure should not mask a successful stop.
    }
  }, [terminateMutation, queryClient, runId, namespace, onActionComplete, notification]);

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
    } catch (error) {
      notification.error(
        'Failed to delete run',
        error instanceof Error ? error.message : 'An unknown error occurred',
      );
      throw error;
    }
    try {
      await onActionComplete?.();
    } catch {
      // Caller refresh failure should not mask a successful delete.
    }
  }, [deleteMutation, queryClient, runId, namespace, onActionComplete, notification]);

  return {
    handleRetry,
    handleConfirmStop,
    handleDelete,
    isRetrying: retryMutation.isPending,
    isTerminating: terminateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
