import { SortableData } from '@odh-dashboard/internal/components/table/types';
import { RecentlyVisitedResource } from '../../types/metrics';

export const recentlyVisitedResourcesColumns: SortableData<RecentlyVisitedResource>[] = [
  {
    field: 'objectName',
    label: 'Resource name',
    width: 25,
    sortable: false,
  },
  {
    field: 'object_type',
    label: 'Resource type',
    width: 25,
    sortable: false,
  },
  {
    field: 'timestamp',
    label: 'Last viewed',
    width: 25,
    sortable: (a: RecentlyVisitedResource, b: RecentlyVisitedResource): number => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      return bTime - aTime;
    },
  },
];

/* eslint-disable camelcase -- keys match Feast API resource type values */
export const resourceTypeMap: Record<string, string> = {
  entities: 'entity',
  feature_views: 'feature views',
  saved_datasets: 'saved datasets',
  data_sources: 'data sources',
  feature_services: 'feature services',
  features: 'features',
};
/* eslint-enable camelcase */

export const EMPTY_STATE_MESSAGES = {
  RECENTLY_VISITED_RESOURCES: 'No recently visited resources.',
  POPULAR_TAGS: 'No feature views yet',
  METRICS: 'No metrics available',
} as const;
