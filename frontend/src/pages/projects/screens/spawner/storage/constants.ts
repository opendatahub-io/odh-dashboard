import { SortableData, kebabTableColumn } from '~/components/table';
import { StorageData } from '~/pages/projects/types';

export const clusterStorageTableColumns: SortableData<StorageData>[] = [
  {
    label: 'ID',
    field: 'id',
    sortable: false,
    className: 'pf-v5-u-hidden',
  },
  {
    label: 'Name',
    field: 'name',
    sortable: false,
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
  mountPath: '/opt/apt-root/src/',
  storageClassName: '',
};
