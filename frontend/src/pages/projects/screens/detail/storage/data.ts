import { SortableData } from '#~/components/table';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { AccessModeColumnInfo } from '#~/pages/projects/screens/detail/storage/AccessModeLabel.tsx';
import { getStorageClassConfig } from '#~/pages/storageClasses/utils';
import { StorageTableData } from './types';

export const columns: SortableData<StorageTableData>[] = [
  {
    field: 'name',
    label: 'Name',
    width: 25,
    sortable: (a, b) =>
      getDisplayNameFromK8sResource(a.pvc).localeCompare(getDisplayNameFromK8sResource(b.pvc)),
  },
  {
    field: 'storage',
    label: 'Storage class',
    width: 20,
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
    field: 'accessMode',
    label: 'Access mode',
    width: 25,
    sortable: (a, b) =>
      (a.pvc.spec.accessModes[0] ?? '').localeCompare(b.pvc.spec.accessModes[0] ?? ''),
    info: {
      popover: AccessModeColumnInfo,
      popoverProps: {
        showClose: true,
        maxWidth: '500px',
      },
    },
  },
  {
    field: 'type',
    label: 'Type',
    width: 25,
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
