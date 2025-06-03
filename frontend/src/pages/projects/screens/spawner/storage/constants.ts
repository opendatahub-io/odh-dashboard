import { SortableData, kebabTableColumn } from '#~/components/table';
import { AccessModeColumnInfo } from '#~/pages/projects/screens/detail/storage/data';
import { StorageData } from '#~/pages/projects/types';
import { MOUNT_PATH_PREFIX } from './const';

export const clusterStorageTableColumns: SortableData<StorageData>[] = [
  {
    label: 'ID',
    field: 'id',
    sortable: false,
    visibility: ['hidden'],
  },
  {
    label: 'Name',
    field: 'name',
    sortable: false,
  },
  {
    label: 'Access mode',
    field: 'accessMode',
    sortable: false,
    width: 30,
    info: {
      popover: AccessModeColumnInfo,
      popoverProps: {
        showClose: true,
        maxWidth: '500px',
      },
    },
  },
  {
    label: 'Storage size',
    field: 'size',
    sortable: false,
  },
  {
    label: 'Mount path',
    field: 'mountPath',
    sortable: false,
  },
  kebabTableColumn(),
];

export const defaultClusterStorage = {
  name: 'storage',
  description: '',
  size: '20Gi',
  mountPath: MOUNT_PATH_PREFIX,
  accessMode: 'ReadWriteOnce',
};
