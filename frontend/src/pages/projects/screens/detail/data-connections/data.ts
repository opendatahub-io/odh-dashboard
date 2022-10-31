import { SortableData } from '../../../../../utilities/useTableColumnSort';
import { DataConnection } from '../../../types';
import { getDataConnectionDisplayName } from './utils';

export const columns: SortableData<DataConnection>[] = [
  {
    field: 'empty',
    label: '',
    sortable: false,
  },
  {
    field: 'name',
    label: 'Name',
    width: 20,
    sortable: (a, b) =>
      getDataConnectionDisplayName(a).localeCompare(getDataConnectionDisplayName(b)),
  },
  {
    field: 'type',
    label: 'Type',
    width: 20,
    sortable: false,
  },
  {
    field: 'connections',
    label: 'Connected workbenches',
    width: 30,
    sortable: false,
  },
  {
    field: 'provider',
    label: 'Provider',
    sortable: false,
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];
