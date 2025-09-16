import { SortableData } from 'mod-arch-shared';
import { MCPTool } from '~/app/types';

// Column definitions for MCP Tools modal table
const MCPToolsColumns: SortableData<MCPTool>[] = [
  {
    field: 'nameAndPermissions',
    label: '',
    sortable: false,
    width: 50,
  },
  {
    field: 'description',
    label: '',
    sortable: false,
    width: 40,
  },
];

export default MCPToolsColumns;
