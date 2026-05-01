import { SortableData } from 'mod-arch-shared';
import { McpDeployment, McpDeploymentPhase } from '~/odh/types/mcpDeploymentTypes';
import { getDeploymentDisplayName } from './utils';

const phaseOrder: Record<McpDeploymentPhase, number> = {
  [McpDeploymentPhase.RUNNING]: 0,
  [McpDeploymentPhase.PENDING]: 1,
  [McpDeploymentPhase.FAILED]: 2,
};

export const mcpDeploymentColumns: SortableData<McpDeployment>[] = [
  {
    field: 'name',
    label: 'Name',
    sortable: (a, b) => getDeploymentDisplayName(a).localeCompare(getDeploymentDisplayName(b)),
    width: 20,
  },
  {
    field: 'server',
    label: 'MCP server',
    sortable: (a, b) => (a.serverName ?? '').localeCompare(b.serverName ?? ''),
    width: 20,
  },
  {
    field: 'created',
    label: 'Created',
    sortable: (a, b) =>
      new Date(b.creationTimestamp).getTime() - new Date(a.creationTimestamp).getTime(),
    width: 20,
  },
  {
    field: 'status',
    label: 'Status',
    sortable: (a, b) => phaseOrder[a.phase] - phaseOrder[b.phase],
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
