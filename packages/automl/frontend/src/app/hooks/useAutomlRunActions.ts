import { useQueryClient } from '@tanstack/react-query';
import React from 'react';
import {
  useArchivePipelineRunMutation,
  useRetryPipelineRunMutation,
  useTerminatePipelineRunMutation,
} from '~/app/hooks/mutations';
import { useNotification } from '~/app/hooks/useNotification';

type AutomlRunActions = {
  handleRetry: () => Promise<void>;
  handleConfirmStop: () => Promise<void>;
  handleArchive: () => Promise<void>;
  isRetrying: boolean;
  isTerminating: boolean;
  isArchiving: boolean;
};

/**
 * Encapsulates retry and stop (terminate) actions for a pipeline run,
 * including mutation state and toast notifications.
 */
export const useAutomlRunActions = (
  namespace: string,
  runId: string,
  onActionComplete?: () => void | Promise<void>,
): AutomlRunActions => {
  const queryClient = useQueryClient();
  const notification = useNotification();
  const retryMutation = useRetryPipelineRunMutation(namespace, runId);
  const terminateMutation = useTerminatePipelineRunMutation(namespace, runId);
  const archiveMutation = useArchivePipelineRunMutation(namespace, runId);

  const handleRetry = React.useCallback(async () => {
    try {
      await retryMutation.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: ['pipelineRun', runId, namespace] });
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
      await queryClient.invalidateQueries({ queryKey: ['pipelineRun', runId, namespace] });
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

  const handleArchive = React.useCallback(async () => {
    try {
      await archiveMutation.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: ['pipelineRun', runId, namespace] });
      notification.success(
        'Run archived successfully',
        'The run has been archived and will no longer appear in the runs list',
      );
    } catch (error) {
      notification.error(
        'Failed to archive run',
        error instanceof Error ? error.message : 'An unknown error occurred',
      );
      return;
    }
    try {
      await onActionComplete?.();
    } catch {
      // Caller refresh failure should not mask a successful archive.
    }
  }, [archiveMutation, queryClient, runId, namespace, onActionComplete, notification]);

  return {
    handleRetry,
    handleConfirmStop,
    handleArchive,
    isRetrying: retryMutation.isPending,
    isTerminating: terminateMutation.isPending,
    isArchiving: archiveMutation.isPending,
  };
};
