import { SortableData } from '@odh-dashboard/internal/components/table/types';
import { DataSource } from '../../types/dataSources';

export const columns: SortableData<DataSource>[] = [
  {
    field: 'name',
    label: 'Name',
    width: 40,
    sortable: (a: DataSource, b: DataSource): number => a.name.localeCompare(b.name),
  },
  {
    field: 'project',
    label: 'Project',
    width: 10,
    sortable: (a: DataSource, b: DataSource): number =>
      (a.project ?? '').localeCompare(b.project ?? ''),
  },
  {
    field: 'type',
    label: 'Data source connector',
    width: 10,
    sortable: (a: DataSource, b: DataSource): number => a.type.localeCompare(b.type),
    info: {
      popover: 'The Feast SDK class that defines how to connect to the data source.',
      popoverProps: {
        position: 'top',
      },
    },
  },
  {
    field: 'featureViews',
    label: 'Feature views',
    width: 10,
    sortable: false,
    info: {
      popover:
        'The total number of feature views that are configured to pull features from a data source.',
      popoverProps: {
        position: 'top',
      },
    },
  },
  {
    field: 'meta.lastUpdatedTimestamp',
    label: 'Last modified',
    width: 10,
    sortable: (a: DataSource, b: DataSource): number =>
      a.meta.lastUpdatedTimestamp.localeCompare(b.meta.lastUpdatedTimestamp),
  },
  {
    field: 'meta.createdTimestamp',
    label: 'Created',
    width: 10,
    sortable: (a: DataSource, b: DataSource): number =>
      a.meta.createdTimestamp.localeCompare(b.meta.createdTimestamp),
  },
  {
    field: 'owner',
    label: 'Owner',
    width: 10,
    sortable: (a: DataSource, b: DataSource): number =>
      (a.owner ?? '').localeCompare(b.owner ?? ''),
  },
];

export const dataSourceTableFilterKeyMapping = {
  name: 'name',
  project: 'project',
  type: 'type',
  featureViews: 'featureViews',
  created: 'meta.createdTimestamp',
  updated: 'meta.lastUpdatedTimestamp',
  owner: 'owner',
};
export const dataSourceTableFilterOptions: Record<string, string> = {
  name: 'Name',
  project: 'Project',
  type: 'Data source connector',
  featureViews: 'Feature views',
  updated: 'Modified after',
  created: 'Created after',
  owner: 'Owner',
};

export const DataSourceDetailsTab = {
  DETAILS: 'Details',
  FEATURE_VIEWS: 'Feature views',
  SCHEMA: 'Schema',
};
