import { SortableData } from 'mod-arch-shared';
import { MCPTool } from '~/app/types';

const MCPToolsColumns: SortableData<MCPTool>[] = [
  {
    field: 'checkbox',
    label: '',
    sortable: false,
    width: 10,
  },
  {
    field: 'toolName',
    label: 'Tool name',
    sortable: (a, b) => a.name.localeCompare(b.name),
    width: 40,
  },
  {
    field: 'description',
    label: 'Description',
    sortable: (a, b) => a.description.localeCompare(b.description),
    width: 60,
  },
];

export default MCPToolsColumns;
