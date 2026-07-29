export enum AgentRuntimesFilterOption {
  Name = 'name',
  Status = 'status',
}

export enum AgentRuntimeStatusFilter {
  Ready = 'Ready',
  Pending = 'Pending',
  Failed = 'Failed',
}

export const agentRuntimeStatusFilterOptions = Object.values(AgentRuntimeStatusFilter);

export const agentRuntimesFilterOptions: Record<AgentRuntimesFilterOption, string> = {
  [AgentRuntimesFilterOption.Name]: 'Name',
  [AgentRuntimesFilterOption.Status]: 'Status',
};

export type AgentRuntimeStatusFilterOption = {
  label: AgentRuntimeStatusFilter;
  value: AgentRuntimeStatusFilter;
};

export type AgentRuntimesFilterData = {
  [AgentRuntimesFilterOption.Name]: string | undefined;
  [AgentRuntimesFilterOption.Status]: AgentRuntimeStatusFilterOption | undefined;
};

export const emptyAgentRuntimesFilterData: AgentRuntimesFilterData = {
  [AgentRuntimesFilterOption.Name]: undefined,
  [AgentRuntimesFilterOption.Status]: undefined,
};
