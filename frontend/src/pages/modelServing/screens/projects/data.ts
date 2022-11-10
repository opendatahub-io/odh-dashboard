import { ServingRuntimeKind } from '../../../../k8sTypes';
import { SortableData } from '../../../../utilities/useTableColumnSort';

export const columns: SortableData<ServingRuntimeKind>[] = [
  {
    field: 'empty',
    label: '',
    sortable: false,
  },
  {
    field: 'type',
    label: 'Type',
    width: 25,
    sortable: false,
  },
  {
    field: 'models',
    label: 'Deployed models',
    width: 25,
    sortable: false,
  },
  {
    field: 'tokens',
    label: 'Tokens',
    width: 20,
    sortable: false,
  },
  {
    field: 'metrics',
    label: '',
    sortable: false,
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];
