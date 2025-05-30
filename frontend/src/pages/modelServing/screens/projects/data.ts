import { ServingRuntimeKind } from '#~/k8sTypes';
import { SortableData } from '#~/components/table';

export const columns: SortableData<ServingRuntimeKind>[] = [
  {
    field: 'empty',
    label: '',
    sortable: false,
  },
  {
    field: 'model-name',
    label: 'Model Server Name',
    width: 25,
    sortable: false,
  },
  {
    field: 'template-name',
    label: 'Serving Runtime',
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
