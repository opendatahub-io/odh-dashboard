import { SortableData } from 'mod-arch-shared';
import { AIModel } from '~/app/types';

export const aiModelColumns: SortableData<AIModel>[] = [
  {
    field: 'model_name',
    label: 'Model deployment name',
    sortable: true,
    width: 25,
  },
  {
    field: 'internalEndpoint',
    label: 'Internal endpoint',
    sortable: false,
    width: 15,
  },
  {
    field: 'externalEndpoint',
    label: 'External endpoint',
    sortable: false,
    width: 15,
  },
  {
    field: 'usecase',
    label: 'Use Case',
    sortable: false,
    width: 15,
  },
  {
    field: 'status',
    label: 'Status',
    sortable: false,
    width: 15,
  },
  {
    field: 'playground',
    label: 'Playground',
    sortable: false,
    width: 15,
  },
];
