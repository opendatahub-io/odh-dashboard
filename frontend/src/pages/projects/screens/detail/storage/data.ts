import { SortableData } from '~/components/table';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { PersistentVolumeClaimKind } from '~/k8sTypes';

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
    sortable: (a, b) =>
      getDisplayNameFromK8sResource(a).localeCompare(getDisplayNameFromK8sResource(b)),
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
