import { kebabTableColumn, SortableData } from 'mod-arch-shared';
import { McpCatalogSourceConfig } from '~/app/mcpServerCatalogTypes';
import {
  MCP_TABLE_COLUMN_LABELS,
  MCP_TABLE_COLUMN_POPOVERS,
} from '~/app/pages/mcpCatalogSettings/constants';

export const mcpCatalogSourceConfigsColumns: SortableData<McpCatalogSourceConfig>[] = [
  {
    field: 'name',
    label: MCP_TABLE_COLUMN_LABELS.NAME,
    sortable: (a, b) => a.name.localeCompare(b.name),
    width: 20,
  },
  {
    field: 'filters',
    label: MCP_TABLE_COLUMN_LABELS.SERVER_VISIBILITY,
    sortable: false,
    info: {
      popover: MCP_TABLE_COLUMN_POPOVERS.SERVER_VISIBILITY,
    },
    width: 15,
  },
  {
    field: 'type',
    label: MCP_TABLE_COLUMN_LABELS.SOURCE_TYPE,
    sortable: false,
    width: 15,
  },
  {
    field: 'enabled',
    label: MCP_TABLE_COLUMN_LABELS.ENABLE,
    sortable: false,
    info: {
      popover: MCP_TABLE_COLUMN_POPOVERS.ENABLE,
    },
    width: 10,
  },
  {
    field: 'status',
    label: MCP_TABLE_COLUMN_LABELS.VALIDATION_STATUS,
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
