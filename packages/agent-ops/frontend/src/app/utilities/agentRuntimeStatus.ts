import { LabelProps } from '@patternfly/react-core';

export enum AgentRuntimeApiStatus {
  Ready = 'ready',
  Running = 'running',
  Stopped = 'stopped',
  Pending = 'pending',
  Failed = 'failed',
}

export enum AgentRuntimeDisplayStatus {
  Ready = 'Ready',
  Stopped = 'Stopped',
  Pending = 'Pending',
  Failed = 'Failed',
  Unknown = 'Unknown',
}

export type AgentRuntimeStatusMapping = {
  displayStatus: AgentRuntimeDisplayStatus;
  labelStatus?: LabelProps['status'];
  labelColor?: LabelProps['color'];
  labelVariant?: LabelProps['variant'];
};

const STATUS_SORT_WEIGHTS: Record<AgentRuntimeDisplayStatus, number> = {
  [AgentRuntimeDisplayStatus.Ready]: 0,
  [AgentRuntimeDisplayStatus.Pending]: 1,
  [AgentRuntimeDisplayStatus.Stopped]: 2,
  [AgentRuntimeDisplayStatus.Failed]: 3,
  [AgentRuntimeDisplayStatus.Unknown]: 4,
};

const normalizeAgentRuntimeStatus = (status: string | undefined): string =>
  status?.trim().toLowerCase() ?? '';

export const mapAgentRuntimeStatus = (status: string | undefined): AgentRuntimeStatusMapping => {
  switch (normalizeAgentRuntimeStatus(status)) {
    case AgentRuntimeApiStatus.Ready:
    case AgentRuntimeApiStatus.Running:
      return { displayStatus: AgentRuntimeDisplayStatus.Ready, labelStatus: 'success' };
    case AgentRuntimeApiStatus.Stopped:
      return { displayStatus: AgentRuntimeDisplayStatus.Stopped, labelColor: 'grey' };
    case AgentRuntimeApiStatus.Pending:
      return { displayStatus: AgentRuntimeDisplayStatus.Pending, labelColor: 'purple' };
    case AgentRuntimeApiStatus.Failed:
      return {
        displayStatus: AgentRuntimeDisplayStatus.Failed,
        labelStatus: 'danger',
        labelVariant: 'filled',
      };
    default:
      return { displayStatus: AgentRuntimeDisplayStatus.Unknown, labelColor: 'grey' };
  }
};

export const getAgentRuntimeStatusSortWeight = (status: string | undefined): number =>
  STATUS_SORT_WEIGHTS[mapAgentRuntimeStatus(status).displayStatus];
