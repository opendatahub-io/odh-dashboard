import { SortableData } from 'mod-arch-shared';
import { MCPServer } from '~/app/types';

const MCPServerColumns: SortableData<MCPServer>[] = [
  {
    field: 'checkbox',
    label: '',
    sortable: false,
    width: 10,
  },
  {
    field: 'name',
    label: 'Name',
    sortable: (a, b) => a.name.localeCompare(b.name),
    width: 60,
  },
  {
    field: 'status',
    label: 'Status',
    sortable: false,
    width: 15,
  },
  {
    field: 'endpoint',
    label: 'Endpoint',
    sortable: false,
    width: 15,
  },
];

export default MCPServerColumns;
