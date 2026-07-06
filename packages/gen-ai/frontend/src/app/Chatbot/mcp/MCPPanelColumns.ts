import { SortableData } from 'mod-arch-shared';
import { MCPServer } from '~/app/types';

const MCPPanelColumns: SortableData<MCPServer>[] = [
  {
    field: 'checkbox',
    label: '',
    sortable: false,
    width: 15,
  },
  {
    field: 'name',
    label: 'Name',
    sortable: (a, b) => a.name.localeCompare(b.name),
    width: 50,
  },
  {
    field: 'tools',
    label: 'Tools',
    sortable: false,
    width: 25,
  },
  {
    field: 'actions',
    label: 'Auth',
    sortable: false,
    width: 10,
  },
];

export default MCPPanelColumns;
