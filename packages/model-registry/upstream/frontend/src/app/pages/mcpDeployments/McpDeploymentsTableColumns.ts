import { SortableData } from 'mod-arch-shared';
import { McpDeployment, McpDeploymentPhase } from '~/app/mcpDeploymentTypes';
import { getServerDisplayName } from './utils';

const phaseOrder: Record<McpDeploymentPhase, number> = {
  [McpDeploymentPhase.RUNNING]: 0,
  [McpDeploymentPhase.PENDING]: 1,
  [McpDeploymentPhase.FAILED]: 2,
};

export const mcpDeploymentColumns: SortableData<McpDeployment>[] = [
  {
    field: 'server',
    label: 'Server',
    sortable: (a, b) => getServerDisplayName(a).localeCompare(getServerDisplayName(b)),
    width: 20,
  },
  {
    field: 'name',
    label: 'Name',
    sortable: (a, b) => a.name.localeCompare(b.name),
    width: 20,
  },
  {
    field: 'created',
    label: 'Created',
    sortable: (a, b) =>
      new Date(a.creationTimestamp).getTime() - new Date(b.creationTimestamp).getTime(),
    width: 20,
  },
  {
    field: 'status',
    label: 'Status',
    sortable: (a, b) => (phaseOrder[a.phase] ?? 3) - (phaseOrder[b.phase] ?? 3),
    width: 15,
  },
  {
    field: 'service',
    label: 'Service',
    sortable: false,
    width: 10,
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];
