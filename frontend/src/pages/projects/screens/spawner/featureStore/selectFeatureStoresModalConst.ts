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

/** Available / with-project first, then alphabetical by name. */
export const compareFeatureStoresConnectedFirst = (
  a: SelectedFeatureStoreConfig,
  b: SelectedFeatureStoreConfig,
): number => {
  const aUnavailable = !!a.isUnavailable;
  const bUnavailable = !!b.isUnavailable;
  if (aUnavailable !== bUnavailable) {
    return aUnavailable ? 1 : -1;
  }
  return a.projectName.localeCompare(b.projectName);
};

/** Rows with a project first, then alphabetical by project. */
export const compareFeatureStoresWithProjectFirst = (
  a: SelectedFeatureStoreConfig,
  b: SelectedFeatureStoreConfig,
): number => {
  const aHasProject = !a.isUnavailable && !!a.namespace;
  const bHasProject = !b.isUnavailable && !!b.namespace;
  if (aHasProject !== bHasProject) {
    return aHasProject ? -1 : 1;
  }
  return a.namespace.localeCompare(b.namespace);
};

export const selectFeatureStoresColumns: SortableData<SelectedFeatureStoreConfig>[] = [
  { label: '', field: 'checkbox', width: 10, sortable: false },
  {
    label: 'Name',
    field: 'projectName',
    width: 30,
    sortable: compareFeatureStoresConnectedFirst,
  },
  {
    label: 'Project',
    field: 'namespace',
    width: 30,
    sortable: compareFeatureStoresWithProjectFirst,
  },
  {
    label: 'Permissions',
    field: 'permissions',
    width: 30,
    sortable: false,
  },
];
