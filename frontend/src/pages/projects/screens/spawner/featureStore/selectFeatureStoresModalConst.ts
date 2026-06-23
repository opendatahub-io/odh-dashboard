import type { SortableData } from '#~/components/table/types';
import type { FeatureStoreProject } from '#~/api/featureStore/custom';
import type { WorkbenchFeatureStoreConfig } from './useWorkbenchFeatureStores';

export const SELECT_FEATURE_STORES_MODAL_TITLE = 'Select feature stores';

export const SELECT_FEATURE_STORES_MODAL_DESCRIPTION = 'Select feature stores to connect';

export const FEATURE_STORE_NAMESPACE_COLUMN_INFO =
  'Kubernetes namespace where the Feature Store registry is deployed.';

export const FEATURE_STORE_PERMISSION_LABEL_THRESHOLD = 2;

export type FeatureStoreIdentifiable =
  | Pick<FeatureStoreProject, 'namespace' | 'feastProjectName'>
  | Pick<WorkbenchFeatureStoreConfig, 'namespace' | 'projectName'>;

export const getFeatureStoreProjectId = (item: FeatureStoreIdentifiable): string => {
  const projectName = 'feastProjectName' in item ? item.feastProjectName : item.projectName;
  return `${item.namespace}/${projectName}`;
};

export const selectFeatureStoresColumns: SortableData<FeatureStoreProject>[] = [
  { label: '', field: 'checkbox', width: 10, sortable: false },
  {
    label: 'Name',
    field: 'feastProjectName',
    width: 20,
    sortable: (a, b) => a.feastProjectName.localeCompare(b.feastProjectName),
  },
  {
    label: 'Namespace',
    field: 'namespace',
    width: 20,
    sortable: (a, b) => a.namespace.localeCompare(b.namespace),
    info: {
      popover: FEATURE_STORE_NAMESPACE_COLUMN_INFO,
    },
  },
  {
    label: 'Description',
    field: 'description',
    width: 25,
    sortable: false,
  },
  {
    label: 'Permission level',
    field: 'permissionLevel',
    width: 25,
    sortable: false,
  },
];
