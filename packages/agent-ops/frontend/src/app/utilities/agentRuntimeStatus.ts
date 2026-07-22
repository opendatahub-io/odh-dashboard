import { LabelProps } from '@patternfly/react-core';

export enum AgentRuntimeApiStatus {
  Ready = 'ready',
  Running = 'running',
  Stopped = 'stopped',
  Suspended = 'suspended',
  Pending = 'pending',
  Provisioning = 'provisioning',
  Failed = 'failed',
  Error = 'error',
  NotReady = 'not ready',
  Deleting = 'deleting',
  Terminating = 'terminating',
}

export enum AgentRuntimeDisplayStatus {
  Ready = 'Ready',
  Provisioning = 'Provisioning',
  Stopped = 'Stopped',
  Pending = 'Pending',
  Failed = 'Failed',
  Error = 'Error',
  Deleting = 'Deleting',
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
  [AgentRuntimeDisplayStatus.Provisioning]: 1,
  [AgentRuntimeDisplayStatus.Pending]: 2,
  [AgentRuntimeDisplayStatus.Deleting]: 3,
  [AgentRuntimeDisplayStatus.Stopped]: 4,
  [AgentRuntimeDisplayStatus.Error]: 5,
  [AgentRuntimeDisplayStatus.Failed]: 6,
  [AgentRuntimeDisplayStatus.Unknown]: 7,
};

const normalizeAgentRuntimeStatus = (status: string | undefined): string =>
  status?.trim().toLowerCase() ?? '';

export const mapAgentRuntimeStatus = (status: string | undefined): AgentRuntimeStatusMapping => {
  switch (normalizeAgentRuntimeStatus(status)) {
    case AgentRuntimeApiStatus.Ready:
    case AgentRuntimeApiStatus.Running:
      return { displayStatus: AgentRuntimeDisplayStatus.Ready, labelColor: 'green' };
    case AgentRuntimeApiStatus.Provisioning:
      return { displayStatus: AgentRuntimeDisplayStatus.Provisioning, labelColor: 'blue' };
    case AgentRuntimeApiStatus.Stopped:
    case AgentRuntimeApiStatus.Suspended:
      return { displayStatus: AgentRuntimeDisplayStatus.Stopped, labelColor: 'grey' };
    case AgentRuntimeApiStatus.Pending:
    case AgentRuntimeApiStatus.NotReady:
      return { displayStatus: AgentRuntimeDisplayStatus.Pending, labelColor: 'blue' };
    case AgentRuntimeApiStatus.Error:
    case AgentRuntimeApiStatus.Failed:
      return {
        displayStatus: AgentRuntimeDisplayStatus.Error,
        labelColor: 'red',
        labelVariant: 'filled',
      };
    case AgentRuntimeApiStatus.Deleting:
    case AgentRuntimeApiStatus.Terminating:
      return { displayStatus: AgentRuntimeDisplayStatus.Deleting, labelColor: 'grey' };
    default:
      return { displayStatus: AgentRuntimeDisplayStatus.Unknown, labelColor: 'grey' };
  }
};

export const getAgentRuntimeStatusSortWeight = (status: string | undefined): number =>
  STATUS_SORT_WEIGHTS[mapAgentRuntimeStatus(status).displayStatus];
