// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- shared table types from ui-core
import type { SortableData } from '@odh-dashboard/ui-core';
import type {
  WorkbenchFeatureStoreConfig,
  SelectedFeatureStoreConfig,
} from './useWorkbenchFeatureStores';

export const SELECT_FEATURE_STORES_MODAL_TITLE = 'Connect feature stores';

export const SELECT_FEATURE_STORES_MODAL_DESCRIPTION =
  'Select feature stores to connect to this workbench.';

export const SELECT_FEATURE_STORES_MODAL_SELECT_BUTTON = 'Select';

export const SELECT_FEATURE_STORES_MODAL_CONNECT_BUTTON = 'Connect';

export const FEATURE_STORE_PERMISSION_LABEL_THRESHOLD = 2;

export const getFeatureStoreProjectId = (
  item: Pick<WorkbenchFeatureStoreConfig, 'namespace' | 'projectName'>,
): string => `${item.namespace}/${item.projectName}`;

export const selectFeatureStoresColumns: SortableData<SelectedFeatureStoreConfig>[] = [
  { label: '', field: 'checkbox', width: 10, sortable: false },
  {
    label: 'Name',
    field: 'projectName',
    width: 30,
    sortable: (a, b) => a.projectName.localeCompare(b.projectName),
  },
  {
    label: 'Project',
    field: 'namespace',
    width: 30,
    sortable: (a, b) => a.namespace.localeCompare(b.namespace),
  },
  {
    label: 'Permissions',
    field: 'permissions',
    width: 30,
    sortable: false,
  },
];
