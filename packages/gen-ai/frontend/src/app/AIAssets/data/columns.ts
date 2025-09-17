import { AIModel } from '~/app/AIAssets/types';
import { SortableData } from '../../../../../../../frontend/src/components/table';

export const aiModelColumns: SortableData<AIModel>[] = [
  {
    field: 'name',
    label: 'Model deployment name',
    sortable: true,
    width: 25,
  },
  {
    field: 'status',
    label: 'Status',
    sortable: true,
    width: 15,
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
    field: 'useCase',
    label: 'Use Case',
    sortable: true,
    width: 15,
  },
  {
    field: 'playground',
    label: 'Playground',
    sortable: false,
    width: 15,
  },
];
