import { SortableData } from 'mod-arch-shared';
import { MCPServer } from '~/app/types';

// Column definitions for MCP Panel table
const MCPPanelColumns: SortableData<MCPServer>[] = [
  {
    field: 'name',
    label: 'Name',
    sortable: (a, b) => a.name.localeCompare(b.name),
    width: 50,
  },
  {
    field: 'checkbox',
    label: '',
    sortable: false,
    width: 15,
  },
  {
    field: 'tools',
    label: 'Tools',
    sortable: false,
    width: 25,
  },
  {
    field: 'actions',
    label: '',
    sortable: false,
    width: 10,
  },
];

export default MCPPanelColumns;
