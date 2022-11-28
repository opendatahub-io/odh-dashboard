import { InferenceServiceKind, SecretKind } from '../../../../k8sTypes';
import { SortableData } from '../../../../utilities/useTableColumnSort';
import { getInferenceServiceDisplayName, getTokenDisplayName } from './utils';

export const inferenceServiceColumns: SortableData<InferenceServiceKind>[] = [
  {
    field: 'name',
    label: 'Model name',
    width: 20,
    sortable: (a, b) =>
      getInferenceServiceDisplayName(a).localeCompare(getInferenceServiceDisplayName(b)),
  },
  {
    field: 'project',
    label: 'Project',
    width: 20,
    sortable: false,
  },
  {
    field: 'endpoint',
    label: 'Inference endpoint',
    width: 45,
    sortable: false,
  },
  {
    field: 'status',
    label: 'Status',
    width: 10,
    sortable: false,
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];

export const tokenColumns: SortableData<SecretKind>[] = [
  {
    field: 'name',
    label: 'Token name',
    width: 20,
    sortable: (a, b) => getTokenDisplayName(a).localeCompare(getTokenDisplayName(b)),
  },
  {
    field: 'token',
    label: 'Token secret',
    width: 80,
    sortable: false,
  },
];
