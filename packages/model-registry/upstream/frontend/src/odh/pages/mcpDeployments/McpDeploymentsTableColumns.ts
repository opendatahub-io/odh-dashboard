import { SortableData } from 'mod-arch-shared';
import { McpDeployment } from '~/odh/types/mcpDeploymentTypes';
import {
  getDeploymentDisplayName,
  getMcpServerSortKey,
  getRegisteredVersionSortKey,
  getStatusSortWeight,
} from './utils';

/** The "Registered version" column only has data for registry-sourced deployments, so it's
 * omitted entirely (not just blank) when the MCP Registry feature is disabled -- see
 * getMcpDeploymentColumns's showRegisteredVersion param. */
const registeredVersionColumn: SortableData<McpDeployment> = {
  field: 'registeredVersion',
  label: 'Registered version',
  sortable: (a, b) => getRegisteredVersionSortKey(a).localeCompare(getRegisteredVersionSortKey(b)),
  width: 10,
};

export const getMcpDeploymentColumns = (
  showRegisteredVersion: boolean,
): SortableData<McpDeployment>[] => [
  {
    field: 'name',
    label: 'Name',
    sortable: (a, b) => getDeploymentDisplayName(a).localeCompare(getDeploymentDisplayName(b)),
    width: 20,
  },
  {
    field: 'server',
    label: 'MCP server',
    sortable: (a, b) => getMcpServerSortKey(a).localeCompare(getMcpServerSortKey(b)),
    width: 20,
  },
  ...(showRegisteredVersion ? [registeredVersionColumn] : []),
  {
    field: 'created',
    label: 'Created',
    sortable: (a, b) =>
      new Date(b.creationTimestamp).getTime() - new Date(a.creationTimestamp).getTime(),
    width: 15,
  },
  {
    field: 'status',
    label: 'Status',
    sortable: (a, b) => getStatusSortWeight(a.conditions) - getStatusSortWeight(b.conditions),
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
