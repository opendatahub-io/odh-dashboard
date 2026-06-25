// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- shared table types from ui-core
import type { SortableData } from '@odh-dashboard/ui-core';
import type { FeatureStoreProject } from '#~/api/featureStore/custom';
import { FEATURE_STORE_NAMESPACE_COLUMN_INFO } from './selectFeatureStoresModalConst';

export const featureStoreConnectedTableColumns: SortableData<FeatureStoreProject>[] = [
  {
    label: 'Name',
    field: 'feastProjectName',
    sortable: (a, b) => a.feastProjectName.localeCompare(b.feastProjectName),
  },
  {
    label: 'Namespace',
    field: 'namespace',
    sortable: (a, b) => a.namespace.localeCompare(b.namespace),
    info: {
      popover: FEATURE_STORE_NAMESPACE_COLUMN_INFO,
    },
  },
  {
    label: 'Description',
    field: 'description',
    sortable: false,
  },
  {
    label: 'Permission level',
    field: 'permissionLevel',
    sortable: false,
  },
  {
    label: '',
    field: 'actions',
    sortable: false,
  },
];
