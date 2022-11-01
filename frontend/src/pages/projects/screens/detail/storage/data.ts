import { SortableData } from '../../../../../utilities/useTableColumnSort';
import { getPvcDisplayName } from '../../../utils';
import { PersistentVolumeClaimKind } from '../../../../../k8sTypes';

export const columns: SortableData<PersistentVolumeClaimKind>[] = [
  {
    field: 'expand',
    label: '',
    sortable: false,
  },
  {
    field: 'name',
    label: 'Name',
    width: 30,
    sortable: (a, b) => getPvcDisplayName(a).localeCompare(getPvcDisplayName(b)),
  },
  {
    field: 'type',
    label: 'Type',
    width: 25,
    sortable: false,
  },
  {
    field: 'connected',
    label: 'Connected workbenches',
    width: 25,
    sortable: false,
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];
