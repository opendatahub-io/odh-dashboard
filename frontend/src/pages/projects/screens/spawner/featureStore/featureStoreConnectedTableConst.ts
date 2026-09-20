// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- shared table types from ui-core
import type { SortableData } from '@odh-dashboard/ui-core';
import type { SelectedFeatureStoreConfig } from './useWorkbenchFeatureStores';
import {
  compareFeatureStoresConnectedFirst,
  compareFeatureStoresWithProjectFirst,
} from './selectFeatureStoresModalConst';

export const featureStoreConnectedTableColumns: SortableData<SelectedFeatureStoreConfig>[] = [
  {
    label: 'Name',
    field: 'projectName',
    sortable: compareFeatureStoresConnectedFirst,
  },
  {
    label: 'Project',
    field: 'namespace',
    sortable: compareFeatureStoresWithProjectFirst,
  },
  {
    label: 'Permissions',
    field: 'permissions',
    sortable: false,
  },
  {
    label: '',
    field: 'actions',
    sortable: false,
  },
];
