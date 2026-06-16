/* eslint-disable camelcase -- test data mirrors raw Feast API snake_case responses */
import {
  transformPagination,
  transformError,
  transformPopularTagsResponse,
  transformRecentlyVisitedResponse,
  transformSearchResponse,
  transformListResponse,
} from '../transforms';

describe('transformPagination', () => {
  it('should map snake_case pagination fields to camelCase', () => {
    const raw = {
      page: 1,
      limit: 25,
      total_count: 100,
      total_pages: 4,
      has_next: true,
      has_previous: false,
    };

    expect(transformPagination(raw)).toStrictEqual({
      page: 1,
      limit: 25,
      totalCount: 100,
      totalPages: 4,
      hasNext: true,
      hasPrevious: false,
    });
  });
});

describe('transformError', () => {
  it('should map all snake_case error fields to camelCase', () => {
    const raw = {
      code: 'FEAST_001',
      message: 'Not found',
      detail: 'Entity missing',
      error_type: 'FeastObjectNotFoundException',
      status_code: 404,
    };

    expect(transformError(raw)).toStrictEqual({
      code: 'FEAST_001',
      message: 'Not found',
      detail: 'Entity missing',
      errorType: 'FeastObjectNotFoundException',
      statusCode: 404,
    });
  });

  it('should set missing fields to undefined', () => {
    const raw = { error_type: 'ServerError' };

    const result = transformError(raw);
    expect(result.code).toBeUndefined();
    expect(result.message).toBeUndefined();
    expect(result.detail).toBeUndefined();
    expect(result.errorType).toBe('ServerError');
    expect(result.statusCode).toBeUndefined();
  });
});

describe('transformPopularTagsResponse', () => {
  it('should transform popular tags from snake_case to camelCase', () => {
    const raw = {
      popular_tags: [
        {
          tag_key: 'env',
          tag_value: 'prod',
          feature_views: [{ name: 'driver_fv', project: 'taxi' }],
          total_feature_views: 1,
        },
      ],
      metadata: { totalFeatureViews: 10, totalTags: 5, limit: 20 },
    };

    expect(transformPopularTagsResponse(raw)).toStrictEqual({
      popularTags: [
        {
          tagKey: 'env',
          tagValue: 'prod',
          featureViews: [{ name: 'driver_fv', project: 'taxi' }],
          totalFeatureViews: 1,
        },
      ],
      metadata: { totalFeatureViews: 10, totalTags: 5, limit: 20 },
    });
  });

  it('should handle empty popular_tags array', () => {
    const raw = {
      popular_tags: [],
      metadata: { totalFeatureViews: 0, totalTags: 0, limit: 20 },
    };

    expect(transformPopularTagsResponse(raw)).toStrictEqual({
      popularTags: [],
      metadata: { totalFeatureViews: 0, totalTags: 0, limit: 20 },
    });
  });
});

describe('transformRecentlyVisitedResponse', () => {
  it('should transform object_name and pagination from snake_case', () => {
    const raw = {
      visits: [
        {
          path: '/api/v1/entities/driver',
          timestamp: '2024-01-01T00:00:00Z',
          project: 'taxi',
          user: 'admin',
          object: 'entity',
          object_name: 'driver',
          method: 'GET',
        },
      ],
      pagination: { total_count: 1 },
    };

    const result = transformRecentlyVisitedResponse(raw);
    expect(result.visits[0].objectName).toBe('driver');
    expect(result.visits).toHaveLength(1);
    expect(result.pagination.totalCount).toBe(1);
  });
});

describe('transformSearchResponse', () => {
  it('should transform search results, pagination, and top-level fields', () => {
    const raw = {
      query: 'driver',
      projects_searched: ['taxi', 'retail'],
      results: [
        {
          type: 'entity',
          name: 'driver',
          description: 'Driver entity',
          project: 'taxi',
          match_score: 0.95,
          feature_view: 'driver_fv',
          matched_tags: { env: 'prod' },
        },
      ],
      pagination: {
        page: 1,
        limit: 50,
        total_count: 1,
        total_pages: 1,
        has_next: false,
      },
      errors: [],
    };

    const result = transformSearchResponse(raw);
    expect(result.projectsSearched).toStrictEqual(['taxi', 'retail']);
    expect(result.results[0].matchScore).toBe(0.95);
    expect(result.results[0].featureView).toBe('driver_fv');
    expect(result.results[0].matchedTags).toStrictEqual({ env: 'prod' });
    expect(result.pagination.totalCount).toBe(1);
    expect(result.pagination.hasNext).toBe(false);
  });
});

describe('transformListResponse', () => {
  it('should transform only the pagination field', () => {
    const raw = {
      entities: [{ name: 'driver' }],
      pagination: {
        page: 1,
        limit: 10,
        total_count: 1,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      },
    };

    type MockList = {
      entities: { name: string }[];
      pagination: {
        page: number;
        limit: number;
        totalCount: number;
        totalPages: number;
        hasNext: boolean;
        hasPrevious: boolean;
      };
    };

    const result = transformListResponse<MockList>(raw);
    expect(result.pagination.totalCount).toBe(1);
    expect(result.pagination.hasNext).toBe(false);
    expect(result.entities).toStrictEqual([{ name: 'driver' }]);
  });
});
