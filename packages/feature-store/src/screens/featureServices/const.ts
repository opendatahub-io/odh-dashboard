import { SortableData } from '@odh-dashboard/internal/components/table/types';
import { FeatureService } from '../../types/featureServices';

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
    label: 'Feature store repository',
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
    info: {
      popover:
        'The feature views included in this feature service. Feature services retrieve features from one or more feature views to support training and inference workflows.',
    },
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

export const featureServiceTableFilterOptions: Record<string, string> = {
  featureService: 'Feature service',
  project: 'Feature store repository',
  tag: 'Tags',
  featureViews: 'Feature views',
  created: 'Created after',
  updated: 'Updated after',
  owner: 'Owner',
};

export enum FeatureServiceDetailsTab {
  DETAILS = 'Details',
  FEATURE_VIEWS = 'Feature views',
}
