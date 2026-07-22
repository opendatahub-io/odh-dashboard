import { kebabTableColumn, SortableData } from '@odh-dashboard/ui-core';
import { AgentRuntime } from '~/app/types/agentRuntimes';
import { getAgentRuntimeStatusSortWeight } from '~/app/utilities/agentRuntimeStatus';

export const agentRuntimesColumns: SortableData<AgentRuntime>[] = [
  {
    label: 'Name',
    field: 'name',
    width: 25,
    sortable: (a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name),
  },
  {
    label: 'Gateway',
    field: 'gateway',
    width: 15,
    sortable: false,
  },
  {
    label: 'Image',
    field: 'containerImage',
    width: 20,
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
