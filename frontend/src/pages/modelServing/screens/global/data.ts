import { InferenceServiceKind } from '../../../../k8sTypes';
import { SortableData } from '../../../../utilities/useTableColumnSort';
import { getInferenceServiceDisplayName } from './utils';

export const columns: SortableData<InferenceServiceKind>[] = [
  {
    field: 'name',
    label: 'Name',
    width: 20,
    sortable: (a, b) =>
      getInferenceServiceDisplayName(a).localeCompare(getInferenceServiceDisplayName(b)),
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
