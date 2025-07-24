import { SortableData } from '#~/components/table/types.ts';
import { FeatureView } from '#~/pages/featureStore/types/featureView.ts';

export const columns: SortableData<FeatureView>[] = [
  {
    field: 'featue_view',
    label: 'Feature View',
    width: 25,
    sortable: (a: FeatureView, b: FeatureView): number => a.spec.name.localeCompare(b.spec.name),
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

export enum FeatureViewToolbarFilterOptions {
  featureView = 'Feature view',
  tags = 'Tags',
}

export const FeatureViewFilterOptions = {
  [FeatureViewToolbarFilterOptions.featureView]: 'Feature view',
  [FeatureViewToolbarFilterOptions.tags]: 'Tags',
};

export type FeatureViewFilterDataType = Record<FeatureViewToolbarFilterOptions, string | undefined>;

export const initialFeatureViewFilterData: FeatureViewFilterDataType = {
  [FeatureViewToolbarFilterOptions.featureView]: '',
  [FeatureViewToolbarFilterOptions.tags]: '',
};
