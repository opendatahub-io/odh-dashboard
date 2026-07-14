import {
  AgentRuntimeDisplayStatus,
  mapAgentRuntimeStatus,
} from '~/app/utilities/agentRuntimeStatus';

export type AgentRuntimeLifecycleVisibility = {
  showRestart: boolean;
  showStop: boolean;
  showDelete: boolean;
};

export const getAgentRuntimeLifecycleVisibility = (
  status: string | undefined,
): AgentRuntimeLifecycleVisibility => {
  const { displayStatus } = mapAgentRuntimeStatus(status);
  const showStop = displayStatus === AgentRuntimeDisplayStatus.Ready;
  const showRestart =
    displayStatus === AgentRuntimeDisplayStatus.Ready ||
    displayStatus === AgentRuntimeDisplayStatus.Stopped;

  return {
    showRestart,
    showStop,
    showDelete: true,
  };
};

export const isAgentRuntimeRunning = (status: string | undefined): boolean => {
  const { displayStatus } = mapAgentRuntimeStatus(status);
  return displayStatus === AgentRuntimeDisplayStatus.Ready;
};
