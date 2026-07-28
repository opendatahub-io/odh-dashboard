import {
  AgentRuntimeDisplayStatus,
  mapAgentRuntimeStatus,
} from '~/app/utilities/agentRuntimeStatus';

const extractRawMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'An unexpected error occurred.';

export const getLifecycleErrorMessage = (error: unknown): string => {
  const raw = extractRawMessage(error);
  const lower = raw.toLowerCase();

  if (lower.includes('forbidden') || lower.includes('403')) {
    return 'You do not have permission to perform this action.';
  }
  if (lower.includes('not found') || lower.includes('404')) {
    return 'The agent deployment could not be found.';
  }
  if (lower.includes('network') || lower.includes('failed to fetch')) {
    return 'Unable to reach the server. Check your connection.';
  }
  if (lower.includes('timeout')) {
    return 'The request timed out. Please try again.';
  }

  return 'An error occurred. Please try again.';
};

export type AgentRuntimeLifecycleVisibility = {
  showStart: boolean;
  showRestart: boolean;
  showStop: boolean;
  showDelete: boolean;
};

export const getAgentRuntimeLifecycleVisibility = (
  status: string | undefined,
): AgentRuntimeLifecycleVisibility => {
  const { displayStatus } = mapAgentRuntimeStatus(status);
  const showStart = displayStatus === AgentRuntimeDisplayStatus.Stopped;
  const showStop = displayStatus === AgentRuntimeDisplayStatus.Ready;
  const showRestart =
    displayStatus === AgentRuntimeDisplayStatus.Ready ||
    displayStatus === AgentRuntimeDisplayStatus.Stopped;

  return {
    showStart,
    showRestart,
    showStop,
    showDelete: true,
  };
};

export const isAgentRuntimeRunning = (status: string | undefined): boolean => {
  const { displayStatus } = mapAgentRuntimeStatus(status);
  return displayStatus === AgentRuntimeDisplayStatus.Ready;
};
