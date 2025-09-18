import { SortableData } from '@odh-dashboard/internal/components/table/types';
import { FeatureView } from '../../types/featureView';
import { MaterializationInterval } from '../../types/global';

export const featureViewTableFilterOptions: Record<string, string> = {
  featureView: 'Feature view',
  project: 'Project',
  tag: 'Tags',
  features: 'Features',
  created: 'Created after',
  updated: 'Updated after',
  owner: 'Owner',
  storeType: 'Store type',
};

export const columns: SortableData<FeatureView>[] = [
  {
    field: 'feature_view',
    label: 'Feature View',
    width: 25,
    sortable: (a: FeatureView, b: FeatureView): number => a.spec.name.localeCompare(b.spec.name),
  },
  {
    field: 'project',
    label: 'Project',
    width: 25,
    sortable: (a: FeatureView, b: FeatureView): number =>
      a.project?.localeCompare(b.project ?? '') ?? 0,
  },
  {
    field: 'tags',
    label: 'Tags',
    width: 25,
    sortable: (a: FeatureView, b: FeatureView): number => {
      const aTags = Object.entries(a.spec.tags ?? {}).map(([key, value]) => `${key}=${value}`);
      const bTags = Object.entries(b.spec.tags ?? {}).map(([key, value]) => `${key}=${value}`);
      return aTags.join(',').localeCompare(bTags.join(','));
    },
  },
  {
    field: 'features',
    label: 'Features',
    width: 25,
    sortable: (a: FeatureView, b: FeatureView): number => {
      const aFeatures = a.spec.features.length;
      const bFeatures = b.spec.features.length;
      return aFeatures - bFeatures;
    },
  },
  {
    field: 'created',
    label: 'Created',
    width: 25,
    sortable: (a: FeatureView, b: FeatureView): number => {
      const aCreated = a.meta.createdTimestamp;
      const bCreated = b.meta.createdTimestamp;
      return new Date(aCreated).getTime() - new Date(bCreated).getTime();
    },
  },
  {
    field: 'updated',
    label: 'Updated',
    width: 25,
    sortable: (a: FeatureView, b: FeatureView): number => {
      const aUpdated = a.meta.lastUpdatedTimestamp;
      const bUpdated = b.meta.lastUpdatedTimestamp;
      return new Date(aUpdated).getTime() - new Date(bUpdated).getTime();
    },
  },
  {
    field: 'owner',
    label: 'Owner',
    width: 25,
    sortable: (a: FeatureView, b: FeatureView): number => {
      const aOwner = a.spec.owner;
      const bOwner = b.spec.owner;
      return aOwner?.localeCompare(bOwner ?? '') ?? 0;
    },
  },
  {
    field: 'store_type',
    label: 'Store type',
    width: 25,
    sortable: false,
  },
];

export type FeatureViewFilterDataType = Record<string, string | undefined>;

export const initialFeatureViewFilterData: FeatureViewFilterDataType = {
  featureView: '',
  tag: '',
};

export enum FeatureViewTab {
  DETAILS = 'Details',
  LINEAGE = 'Lineage',
  FEATURES = 'Features',
  CONSUMING_SERVICES = 'Feature services',
  MATERIALIZATION = 'Materialization',
  TRANSFORMATIONS = 'Transformations',
}

// Schema table constants
export const schemaColumns = [
  {
    field: 'column',
    label: 'Column',
    width: 25 as const,
    sortable: true,
  },
  {
    field: 'type',
    label: 'Type',
    width: 20 as const,
    sortable: true,
  },
  {
    field: 'dataType',
    label: 'Data Type',
    width: 25 as const,
    sortable: true,
  },
  {
    field: 'description',
    label: 'Description',
    width: 30 as const,
    sortable: true,
  },
];

export const schemaFilterOptions = {
  column: 'Column',
  type: 'Type',
  dataType: 'Data Type',
  description: 'Description',
};

// Materialization table constants
export const materializationColumns: SortableData<MaterializationInterval>[] = [
  {
    field: 'interval',
    label: 'Materialization Interval',
    width: 40,
    sortable: false,
  },
  {
    field: 'created',
    label: 'Created',
    width: 30,
    sortable: (a: MaterializationInterval, b: MaterializationInterval): number =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  },
  {
    field: 'last_modified',
    label: 'Last modified',
    width: 30,
    sortable: (a: MaterializationInterval, b: MaterializationInterval): number =>
      new Date(b.endTime).getTime() - new Date(a.endTime).getTime(),
  },
];
