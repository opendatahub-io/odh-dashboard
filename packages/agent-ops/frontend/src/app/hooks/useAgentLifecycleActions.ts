import * as React from 'react';
import {
  useDeleteAgentMutation,
  useStartAgentMutation,
  useStopAgentMutation,
} from '~/app/hooks/mutations';
import { useNotification } from '~/app/hooks/useNotification';
import type { AgentRuntime } from '~/app/types/agentRuntimes';
import {
  getAgentRuntimeLifecycleVisibility,
  getLifecycleErrorMessage,
  isAgentRuntimeRunning,
} from '~/app/utilities/agentLifecycleActions';

type UseAgentLifecycleActionsOptions = {
  runtime: AgentRuntime;
  onRefresh: () => Promise<void>;
};

type UseAgentLifecycleActionsResult = {
  visibility: ReturnType<typeof getAgentRuntimeLifecycleVisibility>;
  isPending: boolean;
  isDeleting: boolean;
  handleRestart: () => Promise<void>;
  handleStop: () => Promise<void>;
  handleDelete: () => Promise<void>;
};

export const useAgentLifecycleActions = ({
  runtime,
  onRefresh,
}: UseAgentLifecycleActionsOptions): UseAgentLifecycleActionsResult => {
  const notification = useNotification();
  const stopMutation = useStopAgentMutation(runtime.namespace, runtime.name);
  const startMutation = useStartAgentMutation(runtime.namespace, runtime.name);
  const deleteMutation = useDeleteAgentMutation(runtime.namespace, runtime.name);
  const [isActionInFlight, setIsActionInFlight] = React.useState(false);
  const isActionInFlightRef = React.useRef(false);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const lifecycleParams = React.useMemo(
    () => ({ namespace: runtime.namespace, name: runtime.name }),
    [runtime.namespace, runtime.name],
  );

  const visibility = React.useMemo(
    () => getAgentRuntimeLifecycleVisibility(runtime.status),
    [runtime.status],
  );

  const isMutationPending =
    stopMutation.isPending || startMutation.isPending || deleteMutation.isPending;
  const isPending = isMutationPending || isActionInFlight;

  const beginAction = React.useCallback(() => {
    if (isActionInFlightRef.current || isMutationPending) {
      return false;
    }

    isActionInFlightRef.current = true;
    setIsActionInFlight(true);
    return true;
  }, [isMutationPending]);

  const endAction = React.useCallback(() => {
    isActionInFlightRef.current = false;
    if (mountedRef.current) {
      setIsActionInFlight(false);
    }
  }, []);

  const handleRestart = React.useCallback(async () => {
    if (!beginAction()) {
      return;
    }

    let stopSucceeded = false;
    try {
      try {
        if (isAgentRuntimeRunning(runtime.status)) {
          await stopMutation.mutateAsync(lifecycleParams);
          stopSucceeded = true;
        }
        await startMutation.mutateAsync(lifecycleParams);
      } catch (error) {
        notification.error('Failed to restart agent deployment', getLifecycleErrorMessage(error));
        if (stopSucceeded) {
          try {
            await onRefresh();
          } catch (refreshError) {
            notification.error('Failed to refresh agent deployment list', getLifecycleErrorMessage(refreshError));
          }
        }
        return;
      }

      notification.success('Agent deployment restarted', `${runtime.name} is restarting.`);

      try {
        await onRefresh();
      } catch (error) {
        notification.error('Failed to refresh agent deployment list', getLifecycleErrorMessage(error));
      }
    } finally {
      endAction();
    }
  }, [
    beginAction,
    endAction,
    lifecycleParams,
    notification,
    onRefresh,
    runtime.name,
    runtime.status,
    startMutation,
    stopMutation,
  ]);

  const handleStop = React.useCallback(async () => {
    if (!beginAction()) {
      return;
    }

    try {
      try {
        await stopMutation.mutateAsync(lifecycleParams);
      } catch (error) {
        notification.error('Failed to stop agent deployment', getLifecycleErrorMessage(error));
        return;
      }

      notification.success('Agent deployment stopped', `${runtime.name} has been stopped.`);

      try {
        await onRefresh();
      } catch (error) {
        notification.error('Failed to refresh agent deployment list', getLifecycleErrorMessage(error));
      }
    } finally {
      endAction();
    }
  }, [beginAction, endAction, lifecycleParams, notification, onRefresh, runtime.name, stopMutation]);

  const handleDelete = React.useCallback(async () => {
    if (!beginAction()) {
      return;
    }

    try {
      try {
        await deleteMutation.mutateAsync(lifecycleParams);
      } catch (error) {
        notification.error('Failed to delete agent deployment', getLifecycleErrorMessage(error));
        throw error;
      }

      notification.success('Agent deployment deleted', `${runtime.name} has been deleted.`);

      try {
        await onRefresh();
      } catch (error) {
        notification.error('Failed to refresh agent deployment list', getLifecycleErrorMessage(error));
      }
    } finally {
      endAction();
    }
  }, [beginAction, deleteMutation, endAction, lifecycleParams, notification, onRefresh, runtime.name]);

  return {
    visibility,
    isPending,
    isDeleting: deleteMutation.isPending,
    handleRestart,
    handleStop,
    handleDelete,
  };
};
