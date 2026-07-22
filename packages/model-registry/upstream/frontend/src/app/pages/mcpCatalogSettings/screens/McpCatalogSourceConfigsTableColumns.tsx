import { kebabTableColumn, SortableData } from 'mod-arch-shared';
import { McpCatalogSourceConfig } from '~/app/mcpServerCatalogTypes';

export const mcpCatalogSourceConfigsColumns: SortableData<McpCatalogSourceConfig>[] = [
  {
    field: 'name',
    label: 'Source name',
    sortable: (a, b) => a.name.localeCompare(b.name),
    width: 20,
  },
  {
    field: 'filters',
    label: 'Server visibility',
    sortable: false,
    info: {
      popover:
        'Shows whether all MCP servers from a source appear in the MCP catalog or if visibility is filtered.',
    },
    width: 15,
  },
  {
    field: 'type',
    label: 'Source type',
    sortable: false,
    width: 15,
  },
  {
    field: 'enabled',
    label: 'Enable',
    sortable: false,
    info: {
      popover:
        'Enable a source to make its MCP servers available to users in your organization from the MCP catalog.',
    },
    width: 10,
  },
  {
    field: 'status',
    label: 'Validation status',
    sortable: false,
    width: 15,
  },
  {
    field: 'actions',
    label: '',
    sortable: false,
    width: 15,
  },
  kebabTableColumn(),
];
