// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- shared table types from ui-core
import type { SortableData } from '@odh-dashboard/ui-core';
import type { WorkbenchFeatureStoreConfig } from './useWorkbenchFeatureStores';
import { FEATURE_STORE_NAMESPACE_COLUMN_INFO } from './selectFeatureStoresModalConst';

export const featureStoreConnectedTableColumns: SortableData<WorkbenchFeatureStoreConfig>[] = [
  {
    label: 'Name',
    field: 'projectName',
    sortable: (a, b) => a.projectName.localeCompare(b.projectName),
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
