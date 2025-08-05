import { SortableData } from '#~/components/table/types.ts';
import { FeatureService } from '#~/pages/featureStore/types/featureServices.ts';

export const columns: SortableData<FeatureService>[] = [
  {
    field: 'feature_service',
    label: 'Feature service',
    width: 25,
    sortable: (a: FeatureService, b: FeatureService): number =>
      a.spec.name.localeCompare(b.spec.name),
  },
  {
    field: 'project',
    label: 'Project',
    width: 25,
    sortable: (a, b): number => (a.project || '').localeCompare(b.project || ''),
  },
  {
    field: 'tags',
    label: 'Tags',
    width: 25,
    sortable: (a: FeatureService, b: FeatureService): number => {
      const aTags = Object.entries(a.spec.tags ?? {}).map(([key, value]) => `${key}=${value}`);
      const bTags = Object.entries(b.spec.tags ?? {}).map(([key, value]) => `${key}=${value}`);
      return aTags.join(',').localeCompare(bTags.join(','));
    },
  },
  {
    field: 'feature_views',
    label: 'Feature views',
    width: 25,
    sortable: (a: FeatureService, b: FeatureService): number => {
      const aFeatureViews = a.spec.features?.length ?? 0;
      const bFeatureViews = b.spec.features?.length ?? 0;
      return aFeatureViews - bFeatureViews;
    },
  },
  {
    field: 'created',
    label: 'Created',
    width: 25,
    sortable: (a: FeatureService, b: FeatureService): number => {
      const aCreated = a.meta.createdTimestamp;
      const bCreated = b.meta.createdTimestamp;
      return new Date(aCreated).getTime() - new Date(bCreated).getTime();
    },
  },
  {
    field: 'updated',
    label: 'Updated',
    width: 25,
    sortable: (a: FeatureService, b: FeatureService): number => {
      const aUpdated = a.meta.lastUpdatedTimestamp;
      const bUpdated = b.meta.lastUpdatedTimestamp;
      return new Date(aUpdated).getTime() - new Date(bUpdated).getTime();
    },
  },
  {
    field: 'owner',
    label: 'Owner',
    width: 25,
    sortable: (a: FeatureService, b: FeatureService): number => {
      const aOwner = a.spec.owner;
      const bOwner = b.spec.owner;
      return aOwner?.localeCompare(bOwner ?? '') ?? 0;
    },
  },
];

export const featureServiceTableFilterOptions = (): Record<string, string> => ({
  featureService: 'Feature service',
  tags: 'Tags',
  featureViews: 'Feature views',
  owner: 'Owner',
});
