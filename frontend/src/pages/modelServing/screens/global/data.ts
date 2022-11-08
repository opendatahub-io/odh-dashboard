import { InferenceServiceKind } from '../../../../k8sTypes';
import { SortableData } from '../../../../utilities/useTableColumnSort';
import { getInferenceServiceDisplayName } from './utils';

export const columns: SortableData<InferenceServiceKind>[] = [
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
