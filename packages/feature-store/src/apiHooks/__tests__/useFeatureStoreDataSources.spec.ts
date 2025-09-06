/* eslint-disable camelcase */
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { useFeatureStoreAPI } from '../../FeatureStoreContext';
import { DataSource, DataSourceList } from '../../types/dataSources';
import useFeatureStoreDataSources from '../useFeatureStoreDataSources';

jest.mock('../../FeatureStoreContext', () => ({
  useFeatureStoreAPI: jest.fn(),
}));

const useFeatureStoreAPIMock = jest.mocked(useFeatureStoreAPI);
const mockGetDataSources = jest.fn();

const mockDataSource = (partial?: Partial<DataSource>): DataSource => ({
  type: 'REQUEST_SOURCE',
  name: 'test-datasource',
  meta: {
    createdTimestamp: '2024-01-01T00:00:00Z',
    lastUpdatedTimestamp: '2024-01-01T00:00:00Z',
  },
  ...partial,
});

const mockDataSourceList = (partial?: Partial<DataSourceList>): DataSourceList => {
  const mockDataSources = [
    mockDataSource({
      type: 'REQUEST_SOURCE',
      name: 'datasource-1',
      requestDataOptions: {
        schema: [
          {
            name: 'loan_amnt',
            valueType: 'INT64',
            tags: {
              request_time: 'true',
              type: 'numerical',
              pii: 'false',
              core_feature: 'true',
              currency: 'USD',
            },
          },
        ],
      },
    }),
    mockDataSource({
      type: 'BATCH_FILE',
      name: 'datasource-2',
      timestampField: 'event_timestamp',
      createdTimestampColumn: 'created_timestamp',
      fileOptions: {
        fileFormat: {
          parquetFormat: {},
        },
        uri: 'data/loan_table.parquet',
      },
      description: 'Loan application data including personal and loan characteristics',
      tags: {
        latency: 'low',
        internal: 'true',
        quality: 'high',
        update_frequency: 'real_time',
        business_critical: 'true',
        source_system: 'loan_origination',
        data_type: 'operational',
      },
    }),
  ];

  return {
    dataSources: mockDataSources,
    pagination: {
      page: 1,
      limit: 50,
      total_count: mockDataSources.length,
      total_pages: 1,
      has_next: false,
      has_previous: false,
    },
    relationships: {},
    ...partial,
  };
};

describe('useFeatureStoreDataSources', () => {
  const mockDataSourceListData: DataSourceList = mockDataSourceList();

  const defaultDataSourceList: DataSourceList = {
    dataSources: [],
    pagination: {
      page: 1,
      limit: 50,
      total_count: 0,
      total_pages: 0,
      has_next: false,
      has_previous: false,
    },
    relationships: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return successful data source list when API is available', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getDataSources: mockGetDataSources,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetDataSources.mockResolvedValue(mockDataSourceListData);

    const renderResult = testHook(useFeatureStoreDataSources)();

    expect(renderResult.result.current.data).toEqual(defaultDataSourceList);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(mockDataSourceListData);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetDataSources).toHaveBeenCalledTimes(1);
    expect(mockGetDataSources).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      undefined,
    );
  });

  it('should return successful data source list with project parameter', async () => {
    const projectName = 'test-project';

    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getDataSources: mockGetDataSources,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetDataSources.mockResolvedValue(mockDataSourceListData);

    const renderResult = testHook(useFeatureStoreDataSources)(projectName);

    expect(renderResult.result.current.data).toEqual(defaultDataSourceList);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(mockDataSourceListData);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetDataSources).toHaveBeenCalledTimes(1);
    expect(mockGetDataSources).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      projectName,
    );
  });

  it('should handle errors when API call fails', async () => {
    const testError = new Error('Failed to fetch data sources');

    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getDataSources: mockGetDataSources,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetDataSources.mockRejectedValue(testError);

    const renderResult = testHook(useFeatureStoreDataSources)();

    expect(renderResult.result.current.data).toEqual(defaultDataSourceList);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(defaultDataSourceList);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toEqual(testError);
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetDataSources).toHaveBeenCalledTimes(1);
  });

  it('should return error when API is not available', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getDataSources: mockGetDataSources,
      },
      apiAvailable: false,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    const renderResult = testHook(useFeatureStoreDataSources)();

    expect(renderResult.result.current.data).toEqual(defaultDataSourceList);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(defaultDataSourceList);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toEqual(new Error('API not yet available'));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetDataSources).not.toHaveBeenCalled();
  });

  it('should be stable when re-rendered with same parameters', async () => {
    const projectName = 'test-project';

    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getDataSources: mockGetDataSources,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetDataSources.mockResolvedValue(mockDataSourceListData);

    const renderResult = testHook(useFeatureStoreDataSources)(projectName);

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToHaveUpdateCount(2);

    renderResult.rerender(projectName);
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable({
      data: false,
      loaded: true,
      error: true,
      refresh: true,
    });
  });

  it('should refetch when project parameter changes', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getDataSources: mockGetDataSources,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetDataSources.mockResolvedValue(mockDataSourceListData);

    const renderResult = testHook(useFeatureStoreDataSources)('project-1');

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetDataSources).toHaveBeenCalledTimes(1);
    expect(mockGetDataSources).toHaveBeenLastCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'project-1',
    );

    renderResult.rerender('project-2');

    await renderResult.waitForNextUpdate();
    expect(mockGetDataSources).toHaveBeenCalledTimes(2);
    expect(mockGetDataSources).toHaveBeenLastCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'project-2',
    );
  });

  it('should handle refresh functionality', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getDataSources: mockGetDataSources,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetDataSources.mockResolvedValue(mockDataSourceListData);

    const renderResult = testHook(useFeatureStoreDataSources)();

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetDataSources).toHaveBeenCalledTimes(1);

    const updatedDataSourceList: DataSourceList = mockDataSourceList({
      dataSources: [
        mockDataSource({
          type: 'REQUEST_SOURCE',
          name: 'datasource-3',
          requestDataOptions: {
            schema: [
              {
                name: 'test_field',
                valueType: 'STRING',
                tags: {},
              },
            ],
          },
        }),
      ],
      pagination: {
        page: 1,
        limit: 50,
        total_count: 1,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      },
    });
    mockGetDataSources.mockResolvedValue(updatedDataSourceList);

    renderResult.result.current.refresh();

    await renderResult.waitForNextUpdate();
    expect(mockGetDataSources).toHaveBeenCalledTimes(2);
    expect(renderResult.result.current.data).toEqual(updatedDataSourceList);
  });

  it('should handle API availability change', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getDataSources: mockGetDataSources,
      },
      apiAvailable: false,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    const renderResult = testHook(useFeatureStoreDataSources)();

    await renderResult.waitForNextUpdate();
    expect(renderResult.result.current.data).toEqual(defaultDataSourceList);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toEqual(new Error('API not yet available'));

    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getDataSources: mockGetDataSources,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetDataSources.mockResolvedValue(mockDataSourceListData);

    renderResult.rerender();

    await renderResult.waitForNextUpdate();
    expect(renderResult.result.current.data).toEqual(mockDataSourceListData);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(mockGetDataSources).toHaveBeenCalledTimes(1);
  });

  it('should handle empty data source list', async () => {
    const emptyDataSourceList: DataSourceList = mockDataSourceList({
      dataSources: [],
      pagination: {
        page: 1,
        limit: 50,
        total_count: 0,
        total_pages: 0,
        has_next: false,
        has_previous: false,
      },
    });

    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getDataSources: mockGetDataSources,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetDataSources.mockResolvedValue(emptyDataSourceList);

    const renderResult = testHook(useFeatureStoreDataSources)();

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(emptyDataSourceList);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should handle project parameter going from defined to undefined', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getDataSources: mockGetDataSources,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetDataSources.mockResolvedValue(mockDataSourceListData);

    const renderResult = testHook(useFeatureStoreDataSources)('test-project');

    await renderResult.waitForNextUpdate();
    expect(mockGetDataSources).toHaveBeenLastCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'test-project',
    );

    renderResult.rerender(undefined);

    await renderResult.waitForNextUpdate();
    expect(mockGetDataSources).toHaveBeenLastCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      undefined,
    );
    expect(mockGetDataSources).toHaveBeenCalledTimes(2);
  });
});
