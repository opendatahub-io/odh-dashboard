import { useQueryClient } from '@tanstack/react-query';
import React from 'react';
import {
  useRetryPipelineRunMutation,
  useTerminatePipelineRunMutation,
} from '~/app/hooks/mutations';
import { useNotification } from '~/app/hooks/useNotification';

type AutoragRunActionsOptions = {
  /** Called after a successful retry or stop to let the caller refresh data immediately. */
  onActionComplete?: () => void;
};

type AutoragRunActions = {
  handleRetry: () => Promise<void>;
  handleConfirmStop: () => Promise<void>;
  isRetrying: boolean;
  isTerminating: boolean;
};

/**
 * Encapsulates retry and stop (terminate) actions for a pipeline run,
 * including mutation state and toast notifications.
 */
export const useAutoragRunActions = (
  namespace: string,
  runId: string,
  options?: AutoragRunActionsOptions,
): AutoragRunActions => {
  const queryClient = useQueryClient();
  const notification = useNotification();
  const retryMutation = useRetryPipelineRunMutation(namespace, runId);
  const terminateMutation = useTerminatePipelineRunMutation(namespace, runId);

  const handleRetry = React.useCallback(async () => {
    try {
      await retryMutation.mutateAsync();
      await queryClient.invalidateQueries({
        queryKey: ['autorag', 'pipelineRun', runId, namespace],
      });
      options?.onActionComplete?.();
      notification.success(
        'Retry submitted successfully',
        'The process is asynchronous and may take some time to take effect',
      );
    } catch (error) {
      notification.error(
        'Failed to retry run',
        error instanceof Error ? error.message : 'An unknown error occurred',
      );
    }
  }, [retryMutation, queryClient, runId, namespace, options, notification]);

  const handleConfirmStop = React.useCallback(async () => {
    try {
      await terminateMutation.mutateAsync();
      options?.onActionComplete?.();
      notification.success(
        'Stop submitted successfully',
        'The process is asynchronous and may take some time to take effect',
      );
    } catch (error) {
      notification.error(
        'Failed to stop run',
        error instanceof Error ? error.message : 'An unknown error occurred',
      );
    }
  }, [terminateMutation, options, notification]);

  return {
    handleRetry,
    handleConfirmStop,
    isRetrying: retryMutation.isPending,
    isTerminating: terminateMutation.isPending,
  };
};
