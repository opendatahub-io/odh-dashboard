/* eslint-disable @typescript-eslint/consistent-type-assertions -- boundary layer casts raw API data */
import { type FeatureStoreError, FeatureStorePagination } from '../types/global';
import {
  PopularTag,
  PopularTagsResponse,
  RecentlyVisitedResource,
  RecentlyVisitedResponse,
} from '../types/metrics';
import { GlobalSearchResult, GlobalSearchResponse } from '../types/search';

// Raw API types mirror the Feast REST API's snake_case field names.
// They are intentionally scoped to this module and never exported.

type RawPagination = {
  page: number;
  limit: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
};

type RawPopularTag = {
  tag_key: string;
  tag_value: string;
  feature_views: { name: string; project: string }[];
  total_feature_views: number;
};

type RawPopularTagsResponse = {
  popular_tags: RawPopularTag[];
  metadata: PopularTagsResponse['metadata'];
};

type RawRecentlyVisitedResource = Omit<RecentlyVisitedResource, 'objectName'> & {
  object_name: string;
};

type RawRecentlyVisitedResponse = {
  visits: RawRecentlyVisitedResource[];
  pagination: RecentlyVisitedResponse['pagination'];
};

type RawSearchResult = Omit<GlobalSearchResult, 'matchScore' | 'matchedTags'> & {
  match_score: number;
  matched_tags?: Record<string, string>;
};

type RawSearchResponse = Omit<GlobalSearchResponse, 'results' | 'projectsSearched'> & {
  projects_searched: string[];
  results: RawSearchResult[];
};

export const transformPagination = (raw: RawPagination): FeatureStorePagination => ({
  page: raw.page,
  limit: raw.limit,
  totalCount: raw.total_count,
  totalPages: raw.total_pages,
  hasNext: raw.has_next,
  hasPrevious: raw.has_previous,
});

export const transformError = (raw: Record<string, unknown>): FeatureStoreError => ({
  code: raw.code as string | undefined,
  message: raw.message as string | undefined,
  detail: raw.detail as string | undefined,
  errorType: raw.error_type as string | undefined,
  statusCode: raw.status_code as number | undefined,
});

const transformPopularTag = (raw: RawPopularTag): PopularTag => ({
  tagKey: raw.tag_key,
  tagValue: raw.tag_value,
  featureViews: raw.feature_views,
  totalFeatureViews: raw.total_feature_views,
});

export const transformPopularTagsResponse = (data: unknown): PopularTagsResponse => {
  const raw = data as RawPopularTagsResponse;
  return {
    popularTags: raw.popular_tags.map(transformPopularTag),
    metadata: raw.metadata,
  };
};

const transformRecentlyVisitedResource = (
  raw: RawRecentlyVisitedResource,
): RecentlyVisitedResource => ({
  path: raw.path,
  timestamp: raw.timestamp,
  project: raw.project,
  user: raw.user,
  object: raw.object,
  objectName: raw.object_name,
  method: raw.method,
});

export const transformRecentlyVisitedResponse = (data: unknown): RecentlyVisitedResponse => {
  const raw = data as RawRecentlyVisitedResponse;
  return {
    visits: raw.visits.map(transformRecentlyVisitedResource),
    pagination: raw.pagination,
  };
};

const transformSearchResult = (raw: RawSearchResult): GlobalSearchResult => ({
  type: raw.type,
  name: raw.name,
  description: raw.description,
  project: raw.project,
  matchScore: raw.match_score,
  featureView: raw.featureView,
  matchedTags: raw.matched_tags,
});

export const transformSearchResponse = (data: unknown): GlobalSearchResponse => {
  const raw = data as RawSearchResponse;
  return {
    query: raw.query,
    projectsSearched: raw.projects_searched,
    results: raw.results.map(transformSearchResult),
    pagination: raw.pagination,
    errors: raw.errors,
  };
};

/**
 * Transforms the pagination field within any list response from snake_case to camelCase.
 * Works for EntityList, FeaturesList, DataSourceList, DataSetList, ProjectList, etc.
 */
export const transformListResponse = <T extends { pagination: FeatureStorePagination }>(
  data: unknown,
): T => {
  const raw = data as Record<string, unknown> & { pagination: RawPagination };
  return { ...raw, pagination: transformPagination(raw.pagination) } as T;
};
