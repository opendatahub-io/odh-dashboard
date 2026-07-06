import { K8sAPIOptions } from '@odh-dashboard/internal/k8sTypes';

export type ResourceCounts = {
  entities: number;
  dataSources: number;
  savedDatasets: number;
  features: number;
  featureViews: number;
  featureServices: number;
};

export type MetricsCountResponse = {
  total?: ResourceCounts;
  perProject?: Record<string, ResourceCounts>;
  project?: string;
  counts?: ResourceCounts;
};

export type PopularTagFeatureView = {
  name: string;
  project: string;
};

export type PopularTag = {
  tag_key: string;
  tag_value: string;
  feature_views: PopularTagFeatureView[];
  total_feature_views: number;
};

export type PopularTagsMetadata = {
  totalFeatureViews: number;
  totalTags: number;
  limit: number;
};

export type PopularTagsResponse = {
  popular_tags: PopularTag[];
  metadata: PopularTagsMetadata;
};

export type RecentlyVisitedResource = {
  path: string;
  timestamp: string;
  project: string;
  user: string;
  object: string;
  object_name: string;
  method: string;
};

export type RecentlyVisitedPagination = {
  totalCount: number;
};

export type RecentlyVisitedResponse = {
  visits: RecentlyVisitedResource[];
  pagination: RecentlyVisitedPagination;
};

export type GetMetricsResourceCount = (
  opts: K8sAPIOptions,
  project?: string,
) => Promise<MetricsCountResponse>;

export type GetPopularTags = (
  opts: K8sAPIOptions,
  project?: string,
  limit?: number,
) => Promise<PopularTagsResponse>;

export type GetRecentlyVisitedResources = (
  opts: K8sAPIOptions,
  project?: string,
  limit?: number,
) => Promise<RecentlyVisitedResponse>;
