import { SortableData } from '@odh-dashboard/internal/components/table/types';
import { DataSet } from '../../types/dataSets';

export const columns: SortableData<DataSet>[] = [
  {
    field: 'spec.name',
    label: 'Name',
    width: 60,
    sortable: (a, b): number => a.spec.name.localeCompare(b.spec.name),
  },
  {
    field: 'project',
    label: 'Project',
    sortable: (a, b): number => (a.project || '').localeCompare(b.project || ''),
  },
  {
    field: 'spec.tags',
    label: 'Tags',
    width: 40,
    sortable: false,
  },
  {
    field: 'spec.featureServiceName',
    label: 'Feature service',
    width: 15,
    sortable: (a, b): number =>
      (a.spec.featureServiceName || '').localeCompare(b.spec.featureServiceName || ''),
    info: {
      popover:
        'The feature service used to create this dataset. It defines which features were included and how they were retrieved at the time the dataset was generated.',
    },
  },
  {
    field: 'meta.lastUpdatedTimestamp',
    label: 'Last modified',
    sortable: (a, b): number =>
      (a.meta.lastUpdatedTimestamp || '').localeCompare(b.meta.lastUpdatedTimestamp || ''),
  },
  {
    field: 'meta.createdTimestamp',
    label: 'Created',
    sortable: (a, b): number =>
      (a.meta.createdTimestamp || '').localeCompare(b.meta.createdTimestamp || ''),
  },
];

export const dataSetTableFilterOptions: Record<string, string> = {
  dataSet: 'Datasets',
  project: 'Project',
  tag: 'Tags',
  featureServiceName: 'Feature service',
  updated: 'Updated after',
  created: 'Created after',
};

export enum DataSetDetailsTab {
  DETAILS = 'Details',
  FEATURES = 'Features',
}
