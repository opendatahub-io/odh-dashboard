import { SortableData } from '#~/components/table';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { getStorageClassConfig } from '#~/pages/storageClasses/utils';
import { StorageTableData } from './types';

export const columns: SortableData<StorageTableData>[] = [
  {
    field: 'name',
    label: 'Name',
    width: 30,
    sortable: (a, b) =>
      getDisplayNameFromK8sResource(a.pvc).localeCompare(getDisplayNameFromK8sResource(b.pvc)),
  },
  {
    field: 'storage',
    label: 'Storage class',
    width: 30,
    sortable: (a, b) =>
      (a.storageClass
        ? getStorageClassConfig(a.storageClass)?.displayName ?? a.storageClass.metadata.name
        : a.pvc.spec.storageClassName ?? ''
      ).localeCompare(
        b.storageClass
          ? getStorageClassConfig(b.storageClass)?.displayName ?? b.storageClass.metadata.name
          : b.pvc.spec.storageClassName ?? '',
      ),
  },
  {
    field: 'type',
    label: 'Type',
    width: 20,
    sortable: false,
  },
  {
    field: 'storage_size',
    label: 'Storage size',
    width: 20,
    sortable: false,
  },
  {
    field: 'connected',
    label: 'Workbench connections',
    width: 20,
    sortable: false,
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];
