import { K8sAPIOptions } from '@odh-dashboard/internal/k8sTypes';

export type GlobalSearchResult = {
  type: string;
  name: string;
  description: string;
  project: string;
  match_score: number;
};

export type GlobalSearchPagination = {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
};

export type GlobalSearchResponse = {
  query: string;
  projects_searched: string[];
  results: GlobalSearchResult[];
  pagination: GlobalSearchPagination;
  errors: string[];
};

export type GlobalSearchOptions = {
  projects: string[];
  query: string;
};

export type GetGlobalSearch = (
  opts: K8sAPIOptions,
  projects: string[],
  query: string,
  page?: number,
  limit?: number,
) => Promise<GlobalSearchResponse>;
