import { SortableData } from '~/components/table';
import { ConnectionTypes } from '~/pages/connectionTypes/const';

export const connectionTypeColumns: SortableData<ConnectionTypes>[] = [
  {
    label: 'Name',
    field: 'name',
    sortable: true,
  },
  {
    label: 'Creator',
    field: 'creator',
    sortable: true,
  },
  {
    label: 'Created',
    field: 'created',
    sortable: true,
  },
  {
    label: 'Enable',
    field: 'Enable',
    sortable: true,
  },
];
