import { SortableData } from 'mod-arch-shared';
import { MaaSModel } from '~/app/types';

export const maasModelColumns: SortableData<MaaSModel>[] = [
  {
    field: 'id',
    label: 'Model deployment name',
    sortable: true,
    width: 30,
  },
  {
    field: 'url',
    label: 'External endpoint',
    sortable: false,
    width: 30,
  },
  {
    field: 'ready',
    label: 'Status',
    sortable: false,
    width: 20,
  },
  {
    field: 'playground',
    label: 'Playground',
    sortable: false,
    width: 20,
  },
];
