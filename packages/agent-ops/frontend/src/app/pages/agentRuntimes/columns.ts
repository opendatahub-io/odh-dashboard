import { kebabTableColumn, SortableData } from '@odh-dashboard/ui-core';
import { AgentRuntime } from '~/app/types/agentRuntimes';
import { getAgentRuntimeStatusSortWeight } from '~/app/utilities/agentRuntimeStatus';

export const agentRuntimesColumns: SortableData<AgentRuntime>[] = [
  {
    label: 'Name',
    field: 'name',
    sortable: (a, b) => a.name.localeCompare(b.name),
  },
  {
    label: 'Project',
    field: 'namespace',
    width: 15,
    sortable: (a, b) => a.namespace.localeCompare(b.namespace),
  },
  {
    label: 'Endpoints',
    field: 'endpointUrl',
    sortable: false,
  },
  {
    label: 'Status',
    field: 'status',
    width: 15,
    sortable: (a, b) =>
      getAgentRuntimeStatusSortWeight(a.status) - getAgentRuntimeStatusSortWeight(b.status),
  },
  kebabTableColumn(),
];
