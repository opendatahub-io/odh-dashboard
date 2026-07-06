import { SortableData } from '@odh-dashboard/ui-core';
import { ServingRuntimeKind } from '#~/k8sTypes';

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
    label: 'Serving runtime',
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
