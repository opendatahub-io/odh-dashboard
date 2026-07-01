export enum AgentRuntimesFilterOption {
  Name = 'name',
  Project = 'project',
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
  [AgentRuntimesFilterOption.Project]: 'Project',
  [AgentRuntimesFilterOption.Status]: 'Status',
};

export type AgentRuntimeStatusFilterOption = {
  label: AgentRuntimeStatusFilter;
  value: AgentRuntimeStatusFilter;
};

export type AgentRuntimesFilterData = {
  [AgentRuntimesFilterOption.Name]: string | undefined;
  [AgentRuntimesFilterOption.Project]: string | undefined;
  [AgentRuntimesFilterOption.Status]: AgentRuntimeStatusFilterOption | undefined;
};

export const emptyAgentRuntimesFilterData: AgentRuntimesFilterData = {
  [AgentRuntimesFilterOption.Name]: undefined,
  [AgentRuntimesFilterOption.Project]: undefined,
  [AgentRuntimesFilterOption.Status]: undefined,
};
