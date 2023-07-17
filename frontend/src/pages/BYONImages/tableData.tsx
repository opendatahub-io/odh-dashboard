import { SortableData } from '~/components/table/useTableColumnSort';
import { BYONImage } from '~/types';

export const columns: SortableData<BYONImage>[] = [
  {
    field: 'expand',
    label: '',
    sortable: false,
  },
  {
    field: 'name',
    label: 'Name',
    sortable: (a, b) => a.name.localeCompare(b.name),
  },
  {
    field: 'description',
    label: 'Description',
    sortable: (a, b) => a.description.localeCompare(b.description),
  },
  {
    field: 'enable',
    label: 'Enable',
    sortable: false,
    info: {
      tooltip: 'Enabled images are selectable when creating workbenches.',
    },
  },
  {
    field: 'provider',
    label: 'Provider',
    sortable: (a, b) => a.provider.localeCompare(b.provider),
  },
  {
    field: 'imported',
    label: 'Imported',
    sortable: (a, b) => new Date(a.imported_time).getTime() - new Date(b.imported_time).getTime(),
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];
