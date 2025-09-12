/* eslint-disable camelcase */
import { GlobalSearchResponse, GlobalSearchResult, GlobalSearchPagination } from '../types/search';
import { FEATURE_STORE_TYPE_TO_CATEGORY } from '../components/FeatureStoreGlobalSearch/const';

export const mockGlobalSearchResult = (
  partial?: Partial<GlobalSearchResult>,
): GlobalSearchResult => ({
  type: 'entity',
  name: 'user_id',
  description: 'Unique identifier for each user',
  project: 'credit_scoring_local',
  match_score: 0.95,
  ...partial,
});

export const mockGlobalSearchPagination = (
  partial?: Partial<GlobalSearchPagination>,
): GlobalSearchPagination => ({
  page: 1,
  limit: 10,
  totalCount: 1,
  totalPages: 1,
  hasNext: false,
  ...partial,
});

export const mockGlobalSearchResponse = (
  partial?: Partial<GlobalSearchResponse>,
): GlobalSearchResponse => ({
  query: 'user',
  projects_searched: ['credit_scoring_local'],
  results: [mockGlobalSearchResult()],
  pagination: mockGlobalSearchPagination(),
  errors: [],
  ...partial,
});

export const createMockSearchResults = (
  searchTerm: string,
  project = 'credit_scoring_local',
): {
  entities: GlobalSearchResult[];
  dataSources: GlobalSearchResult[];
  featureViews: GlobalSearchResult[];
  features: GlobalSearchResult[];
  featureServices: GlobalSearchResult[];
} => ({
  entities: [
    mockGlobalSearchResult({
      type: 'entity',
      name: `${searchTerm}_id`,
      description: `Unique identifier for each ${searchTerm}`,
      project,
    }),
  ],
  dataSources: [
    mockGlobalSearchResult({
      type: 'dataSource',
      name: `${searchTerm}_table`,
      description: `${searchTerm} data including characteristics`,
      project,
    }),
  ],
  featureViews: [
    mockGlobalSearchResult({
      type: 'featureView',
      name: `${searchTerm}_features`,
      description: `${searchTerm} characteristics and terms`,
      project,
    }),
  ],
  features: [
    mockGlobalSearchResult({
      type: 'feature',
      name: `${searchTerm}_score`,
      description: `${searchTerm} calculated score`,
      project,
    }),
  ],
  featureServices: [
    mockGlobalSearchResult({
      type: 'featureService',
      name: `${searchTerm}_service`,
      description: `Service for ${searchTerm} features`,
      project,
    }),
  ],
});

export const transformToSearchItems = (
  results: GlobalSearchResult[],
): Array<{
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  project: string;
}> =>
  results.map((result, index) => ({
    id: `${result.project}-${result.type}-${result.name}-${index}`,
    title: result.name || 'Unknown',
    description: result.description || 'No description',
    type: result.type || 'unknown',
    category: FEATURE_STORE_TYPE_TO_CATEGORY[result.type] || result.type || 'Unknown',
    project: result.project || 'unknown-project',
  }));

export const mockComprehensiveSearchResponse = (
  searchTerm: string,
  project = 'credit_scoring_local',
): GlobalSearchResponse => {
  const mockResults = createMockSearchResults(searchTerm, project);
  const allResults = [
    ...mockResults.entities,
    ...mockResults.dataSources,
    ...mockResults.featureViews,
    ...mockResults.features,
    ...mockResults.featureServices,
  ];

  return mockGlobalSearchResponse({
    query: searchTerm,
    projects_searched: [project],
    results: allResults,
    pagination: mockGlobalSearchPagination({
      totalCount: allResults.length,
      totalPages: 1,
    }),
  });
};

export const mockEmptySearchResponse = (
  searchTerm: string,
  project = 'credit_scoring_local',
): GlobalSearchResponse =>
  mockGlobalSearchResponse({
    query: searchTerm,
    projects_searched: [project],
    results: [],
    pagination: mockGlobalSearchPagination({
      totalCount: 0,
      totalPages: 0,
    }),
  });

export const mockPaginatedSearchResponse = (
  searchTerm: string,
  page: number,
  limit: number,
  totalCount: number,
  project = 'credit_scoring_local',
): GlobalSearchResponse => {
  const results = Array.from({ length: Math.min(limit, totalCount - (page - 1) * limit) }, (_, i) =>
    mockGlobalSearchResult({
      type: 'entity',
      name: `${searchTerm}_${(page - 1) * limit + i + 1}`,
      description: `Description for ${searchTerm} item ${(page - 1) * limit + i + 1}`,
      project,
    }),
  );

  return mockGlobalSearchResponse({
    query: searchTerm,
    projects_searched: [project],
    results,
    pagination: mockGlobalSearchPagination({
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasNext: page < Math.ceil(totalCount / limit),
    }),
  });
};

export const mockSearchResponseWithErrors = (
  searchTerm: string,
  project = 'credit_scoring_local',
): GlobalSearchResponse =>
  mockGlobalSearchResponse({
    query: searchTerm,
    projects_searched: [project],
    results: [],
    pagination: mockGlobalSearchPagination({
      totalCount: 0,
      totalPages: 0,
    }),
    errors: ['Search service temporarily unavailable', 'Index rebuild in progress'],
  });
