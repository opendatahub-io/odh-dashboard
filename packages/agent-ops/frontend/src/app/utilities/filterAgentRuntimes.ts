import {
  AgentRuntimeStatusFilter,
  AgentRuntimesFilterData,
  AgentRuntimesFilterOption,
} from '~/app/pages/agentRuntimes/const';
import { AgentRuntime } from '~/app/types/agentRuntimes';
import {
  AgentRuntimeDisplayStatus,
  mapAgentRuntimeStatus,
} from '~/app/utilities/agentRuntimeStatus';

const assertNever = (value: never): never => {
  throw new Error(`Unhandled AgentRuntimeStatusFilter: ${String(value)}`);
};

const matchesStatusFilter = (
  runtimeStatus: string,
  filterStatus: AgentRuntimeStatusFilter,
): boolean => {
  const { displayStatus } = mapAgentRuntimeStatus(runtimeStatus);

  switch (filterStatus) {
    case AgentRuntimeStatusFilter.Ready:
      return displayStatus === AgentRuntimeDisplayStatus.Ready;
    case AgentRuntimeStatusFilter.Pending:
      return displayStatus === AgentRuntimeDisplayStatus.Pending;
    case AgentRuntimeStatusFilter.Failed:
      return displayStatus === AgentRuntimeDisplayStatus.Failed;
    default:
      return assertNever(filterStatus);
  }
};

export const filterAgentRuntimes = (
  runtimes: AgentRuntime[],
  filters: AgentRuntimesFilterData,
  projectDisplayNames: Record<string, string> = {},
): AgentRuntime[] => {
  let result = runtimes;

  const nameFilter = filters[AgentRuntimesFilterOption.Name]?.trim();
  if (nameFilter) {
    const lower = nameFilter.toLowerCase();
    result = result.filter((runtime) => runtime.name.toLowerCase().includes(lower));
  }

  const projectFilter = filters[AgentRuntimesFilterOption.Project]?.trim();
  if (projectFilter) {
    const lower = projectFilter.toLowerCase();
    result = result.filter((runtime) => {
      const displayName = projectDisplayNames[runtime.namespace] ?? runtime.namespace;
      return (
        runtime.namespace.toLowerCase().includes(lower) || displayName.toLowerCase().includes(lower)
      );
    });
  }

  const statusFilter = filters[AgentRuntimesFilterOption.Status]?.value;
  if (statusFilter) {
    result = result.filter((runtime) => matchesStatusFilter(runtime.status, statusFilter));
  }

  return result;
};

export const hasActiveAgentRuntimesFilters = (filters: AgentRuntimesFilterData): boolean =>
  Boolean(
    filters[AgentRuntimesFilterOption.Name]?.trim() ||
    filters[AgentRuntimesFilterOption.Project]?.trim() ||
    filters[AgentRuntimesFilterOption.Status]?.value,
  );
