import { SortableData } from '#~/components/table';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { getStorageClassConfig } from '#~/pages/storageClasses/utils';
import { getPvcAccessMode } from '#~/pages/projects/utils.ts';
import { getAccessModePopover } from '#~/pages/projects/screens/spawner/storage/getAccessModePopover';
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
    sortable: (a, b) => getPvcAccessMode(a.pvc).localeCompare(getPvcAccessMode(b.pvc)),
    info: {
      popover: getAccessModePopover({}),
      popoverProps: {
        showClose: true,
        maxWidth: '500px',
      },
    },
  },
  {
    field: 'storageContext',
    label: 'Storage context',
    width: 25,
    sortable: false,
    info: {
      popover:
        'The context indicates the purpose of the storage: general purpose, or model storage.',
      popoverProps: {
        showClose: true,
      },
    },
  },
  {
    field: 'storage_size',
    label: 'Storage size',
    width: 20,
    sortable: false,
  },
  {
    field: 'connected',
    label: 'Connected resources',
    width: 20,
    sortable: false,
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];
