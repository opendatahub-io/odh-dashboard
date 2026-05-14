/* eslint-disable camelcase */
import { proxyGET } from '@odh-dashboard/internal/api/proxyUtils';
import { fetchAllPages } from '../paginationUtils';
import { FEATURE_STORE_PAGE_SIZE } from '../../const';
import { FeatureStorePagination } from '../../types/global';

jest.mock('@odh-dashboard/internal/api/proxyUtils', () => ({
  proxyGET: jest.fn(),
}));

jest.mock('../errorUtils', () => ({
  handleFeatureStoreFailures: jest.fn((promise: Promise<unknown>) => promise),
}));

const proxyGETMock = jest.mocked(proxyGET);

type TestItem = { id: number };
type TestResponse = {
  items: TestItem[];
  relationships: Record<string, { name: string }[]>;
  pagination: FeatureStorePagination;
};

const makePagination = (
  overrides: Partial<FeatureStorePagination> = {},
): FeatureStorePagination => ({
  page: 1,
  limit: FEATURE_STORE_PAGE_SIZE,
  total_count: 0,
  total_pages: 1,
  has_next: false,
  has_previous: false,
  ...overrides,
});

const buildResult = (allItems: TestItem[], allResponses: TestResponse[]): TestResponse => ({
  ...allResponses[allResponses.length - 1],
  items: allItems,
  relationships: Object.assign({}, ...allResponses.map((r) => r.relationships)),
});

describe('fetchAllPages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch a single page when has_next is false', async () => {
    const mockResponse: TestResponse = {
      items: [{ id: 1 }, { id: 2 }],
      relationships: { entity1: [{ name: 'rel1' }] },
      pagination: makePagination({ total_count: 2 }),
    };
    proxyGETMock.mockResolvedValue(mockResponse as never);

    const result = await fetchAllPages<TestResponse, TestItem>(
      'test-host',
      '/api/v1/things/all?include_relationships=true',
      { dryRun: true },
      (response) => response.items,
      buildResult,
    );

    expect(proxyGETMock).toHaveBeenCalledTimes(1);
    expect(proxyGETMock).toHaveBeenCalledWith(
      'test-host',
      `/api/v1/things/all?include_relationships=true&limit=${FEATURE_STORE_PAGE_SIZE}&page=1`,
      {},
      { dryRun: true },
    );
    expect(result.items).toEqual([{ id: 1 }, { id: 2 }]);
    expect(result.relationships).toEqual({ entity1: [{ name: 'rel1' }] });
  });

  it('should fetch multiple pages when has_next is true', async () => {
    const page1Items = Array.from({ length: FEATURE_STORE_PAGE_SIZE }, (_, i) => ({ id: i + 1 }));
    const page2Items: TestItem[] = [{ id: 101 }, { id: 102 }];

    proxyGETMock
      .mockResolvedValueOnce({
        items: page1Items,
        relationships: {},
        pagination: makePagination({ has_next: true, page: 1, total_pages: 2 }),
      } as never)
      .mockResolvedValueOnce({
        items: page2Items,
        relationships: {},
        pagination: makePagination({ has_next: false, page: 2, total_pages: 2 }),
      } as never);

    const result = await fetchAllPages<TestResponse, TestItem>(
      'test-host',
      '/api/v1/things/all',
      { dryRun: true },
      (response) => response.items,
      buildResult,
    );

    expect(proxyGETMock).toHaveBeenCalledTimes(2);
    expect(proxyGETMock).toHaveBeenNthCalledWith(
      1,
      'test-host',
      `/api/v1/things/all?limit=${FEATURE_STORE_PAGE_SIZE}&page=1`,
      {},
      { dryRun: true },
    );
    expect(proxyGETMock).toHaveBeenNthCalledWith(
      2,
      'test-host',
      `/api/v1/things/all?limit=${FEATURE_STORE_PAGE_SIZE}&page=2`,
      {},
      { dryRun: true },
    );
    expect(result.items).toHaveLength(FEATURE_STORE_PAGE_SIZE + 2);
  });

  it('should handle an empty first page without looping', async () => {
    const mockResponse: TestResponse = {
      items: [],
      relationships: {},
      pagination: makePagination(),
    };
    proxyGETMock.mockResolvedValue(mockResponse as never);

    const result = await fetchAllPages<TestResponse, TestItem>(
      'test-host',
      '/api/v1/things/all',
      { dryRun: true },
      (response) => response.items,
      buildResult,
    );

    expect(proxyGETMock).toHaveBeenCalledTimes(1);
    expect(result.items).toEqual([]);
  });

  it('should propagate API errors from mid-pagination', async () => {
    const page1Items = Array.from({ length: FEATURE_STORE_PAGE_SIZE }, (_, i) => ({ id: i + 1 }));
    proxyGETMock
      .mockResolvedValueOnce({
        items: page1Items,
        relationships: {},
        pagination: makePagination({ has_next: true }),
      } as never)
      .mockRejectedValueOnce(new Error('Server error'));

    await expect(
      fetchAllPages<TestResponse, TestItem>(
        'test-host',
        '/api/v1/things/all',
        { dryRun: true },
        (response) => response.items,
        buildResult,
      ),
    ).rejects.toThrow('Server error');

    expect(proxyGETMock).toHaveBeenCalledTimes(2);
  });

  it('should merge relationships from multiple pages', async () => {
    const page1Items = Array.from({ length: FEATURE_STORE_PAGE_SIZE }, (_, i) => ({ id: i + 1 }));
    const page1Relationships = { entity1: [{ name: 'rel-a' }], entity2: [{ name: 'rel-b' }] };
    const page2Items: TestItem[] = [{ id: 101 }];
    const page2Relationships = { entity3: [{ name: 'rel-c' }] };

    proxyGETMock
      .mockResolvedValueOnce({
        items: page1Items,
        relationships: page1Relationships,
        pagination: makePagination({ has_next: true }),
      } as never)
      .mockResolvedValueOnce({
        items: page2Items,
        relationships: page2Relationships,
        pagination: makePagination({ has_next: false }),
      } as never);

    const result = await fetchAllPages<TestResponse, TestItem>(
      'test-host',
      '/api/v1/things/all',
      { dryRun: true },
      (response) => response.items,
      buildResult,
    );

    expect(result.relationships).toEqual({
      entity1: [{ name: 'rel-a' }],
      entity2: [{ name: 'rel-b' }],
      entity3: [{ name: 'rel-c' }],
    });
    expect(result.items).toHaveLength(FEATURE_STORE_PAGE_SIZE + 1);
  });

  it('should use ? separator when endpoint has no query params', async () => {
    proxyGETMock.mockResolvedValue({
      items: [],
      relationships: {},
      pagination: makePagination(),
    } as never);

    await fetchAllPages<TestResponse, TestItem>(
      'test-host',
      '/api/v1/things/all',
      { dryRun: true },
      (response) => response.items,
      buildResult,
    );

    expect(proxyGETMock).toHaveBeenCalledWith(
      'test-host',
      `/api/v1/things/all?limit=${FEATURE_STORE_PAGE_SIZE}&page=1`,
      {},
      { dryRun: true },
    );
  });

  it('should use & separator when endpoint already has query params', async () => {
    proxyGETMock.mockResolvedValue({
      items: [],
      relationships: {},
      pagination: makePagination(),
    } as never);

    await fetchAllPages<TestResponse, TestItem>(
      'test-host',
      '/api/v1/things/all?filter=true',
      { dryRun: true },
      (response) => response.items,
      buildResult,
    );

    expect(proxyGETMock).toHaveBeenCalledWith(
      'test-host',
      `/api/v1/things/all?filter=true&limit=${FEATURE_STORE_PAGE_SIZE}&page=1`,
      {},
      { dryRun: true },
    );
  });

  it('should stop at MAX_PAGES even if has_next is still true', async () => {
    const fullPage = Array.from({ length: FEATURE_STORE_PAGE_SIZE }, (_, i) => ({ id: i + 1 }));
    proxyGETMock.mockResolvedValue({
      items: fullPage,
      relationships: {},
      pagination: makePagination({ has_next: true }),
    } as never);

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const result = await fetchAllPages<TestResponse, TestItem>(
      'test-host',
      '/api/v1/things/all',
      { dryRun: true },
      (response) => response.items,
      buildResult,
    );

    expect(proxyGETMock).toHaveBeenCalledTimes(100);
    expect(result.items).toHaveLength(FEATURE_STORE_PAGE_SIZE * 100);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Reached maximum page limit'));

    consoleSpy.mockRestore();
  });
});
