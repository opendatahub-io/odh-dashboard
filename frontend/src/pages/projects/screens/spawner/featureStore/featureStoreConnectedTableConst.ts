// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- shared table types from ui-core
import type { SortableData } from '@odh-dashboard/ui-core';
import type { SelectedFeatureStoreConfig } from './useWorkbenchFeatureStores';

export const featureStoreConnectedTableColumns: SortableData<SelectedFeatureStoreConfig>[] = [
  {
    label: 'Name',
    field: 'projectName',
    sortable: (a, b) => a.projectName.localeCompare(b.projectName),
  },
  {
    label: 'Project',
    field: 'namespace',
    sortable: (a, b) => a.namespace.localeCompare(b.namespace),
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
