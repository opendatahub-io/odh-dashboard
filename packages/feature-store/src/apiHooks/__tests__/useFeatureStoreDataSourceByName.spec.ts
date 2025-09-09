/* eslint-disable camelcase */
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { useFeatureStoreAPI } from '../../FeatureStoreContext';
import { DataSource } from '../../types/dataSources';
import useFeatureStoreDataSourceByName from '../useFeatureStoreDataSourceByName';

jest.mock('../../FeatureStoreContext', () => ({
  useFeatureStoreAPI: jest.fn(),
}));

const useFeatureStoreAPIMock = jest.mocked(useFeatureStoreAPI);
const mockGetDataSourceByName = jest.fn();

const mockDataSource = (partial?: Partial<DataSource>): DataSource => ({
  type: 'BATCH_FILE',
  name: 'test-datasource',
  timestampField: 'event_timestamp',
  createdTimestampColumn: 'created_timestamp',
  fileOptions: {
    fileFormat: {
      parquetFormat: {},
    },
    uri: 'data/test_table.parquet',
  },
  description: 'Test data source for testing purposes',
  tags: {
    test: 'true',
    environment: 'testing',
  },
  owner: 'test-user',
  meta: {
    createdTimestamp: '2024-01-01T00:00:00Z',
    lastUpdatedTimestamp: '2024-01-01T00:00:00Z',
  },
  project: 'test-project',
  featureDefinition: 'test-feature-def',
  ...partial,
});

describe('useFeatureStoreDataSourceByName', () => {
  const defaultDataSource: DataSource = {
    type: 'BATCH_FILE',
    timestampField: '',
    createdTimestampColumn: '',
    fileOptions: {
      uri: '',
    },
    name: '',
    meta: {
      createdTimestamp: '',
      lastUpdatedTimestamp: '',
    },
    featureDefinition: '',
    project: '',
  };

  const mockDataSourceData: DataSource = mockDataSource({
    name: 'test-datasource',
    project: 'test-project',
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return successful data source when API is available and parameters are valid', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getDataSourceByName: mockGetDataSourceByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetDataSourceByName.mockResolvedValue(mockDataSourceData);

    const renderResult = testHook(useFeatureStoreDataSourceByName)(
      'test-project',
      'test-datasource',
    );

    expect(renderResult.result.current.data).toEqual(defaultDataSource);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(mockDataSourceData);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetDataSourceByName).toHaveBeenCalledTimes(1);
    expect(mockGetDataSourceByName).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'test-project',
      'test-datasource',
    );
  });

  it('should return error when API is not available', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getDataSourceByName: mockGetDataSourceByName,
      },
      apiAvailable: false,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    const renderResult = testHook(useFeatureStoreDataSourceByName)(
      'test-project',
      'test-datasource',
    );

    expect(renderResult.result.current.data).toEqual(defaultDataSource);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(defaultDataSource);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toEqual(new Error('API not yet available'));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetDataSourceByName).not.toHaveBeenCalled();
  });

  it('should return error when project parameter is missing', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getDataSourceByName: mockGetDataSourceByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    const renderResult = testHook(useFeatureStoreDataSourceByName)(undefined, 'test-datasource');

    expect(renderResult.result.current.data).toEqual(defaultDataSource);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(defaultDataSource);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toEqual(new Error('Project is required'));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetDataSourceByName).not.toHaveBeenCalled();
  });

  it('should return error when data source name parameter is missing', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getDataSourceByName: mockGetDataSourceByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    const renderResult = testHook(useFeatureStoreDataSourceByName)('test-project', undefined);

    expect(renderResult.result.current.data).toEqual(defaultDataSource);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(defaultDataSource);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toEqual(new Error('Data source name is required'));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetDataSourceByName).not.toHaveBeenCalled();
  });

  it('should return error when both project and data source name parameters are missing', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getDataSourceByName: mockGetDataSourceByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    const renderResult = testHook(useFeatureStoreDataSourceByName)(undefined, undefined);

    expect(renderResult.result.current.data).toEqual(defaultDataSource);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(defaultDataSource);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toEqual(new Error('Project is required'));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetDataSourceByName).not.toHaveBeenCalled();
  });

  it('should handle errors when API call fails', async () => {
    const testError = new Error('Failed to fetch data source');

    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getDataSourceByName: mockGetDataSourceByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetDataSourceByName.mockRejectedValue(testError);

    const renderResult = testHook(useFeatureStoreDataSourceByName)(
      'test-project',
      'test-datasource',
    );

    expect(renderResult.result.current.data).toEqual(defaultDataSource);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(defaultDataSource);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toEqual(testError);
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetDataSourceByName).toHaveBeenCalledTimes(1);
  });

  it('should be stable when re-rendered with same parameters', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getDataSourceByName: mockGetDataSourceByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetDataSourceByName.mockResolvedValue(mockDataSourceData);

    const renderResult = testHook(useFeatureStoreDataSourceByName)(
      'test-project',
      'test-datasource',
    );

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToHaveUpdateCount(2);

    renderResult.rerender('test-project', 'test-datasource');
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
        getDataSourceByName: mockGetDataSourceByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetDataSourceByName.mockResolvedValue(mockDataSourceData);

    const renderResult = testHook(useFeatureStoreDataSourceByName)('project-1', 'test-datasource');

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetDataSourceByName).toHaveBeenCalledTimes(1);
    expect(mockGetDataSourceByName).toHaveBeenLastCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'project-1',
      'test-datasource',
    );

    renderResult.rerender('project-2', 'test-datasource');

    await renderResult.waitForNextUpdate();
    expect(mockGetDataSourceByName).toHaveBeenCalledTimes(2);
    expect(mockGetDataSourceByName).toHaveBeenLastCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'project-2',
      'test-datasource',
    );
  });

  it('should refetch when data source name parameter changes', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getDataSourceByName: mockGetDataSourceByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetDataSourceByName.mockResolvedValue(mockDataSourceData);

    const renderResult = testHook(useFeatureStoreDataSourceByName)('test-project', 'datasource-1');

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetDataSourceByName).toHaveBeenCalledTimes(1);
    expect(mockGetDataSourceByName).toHaveBeenLastCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'test-project',
      'datasource-1',
    );

    renderResult.rerender('test-project', 'datasource-2');

    await renderResult.waitForNextUpdate();
    expect(mockGetDataSourceByName).toHaveBeenCalledTimes(2);
    expect(mockGetDataSourceByName).toHaveBeenLastCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'test-project',
      'datasource-2',
    );
  });

  it('should handle refresh functionality', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getDataSourceByName: mockGetDataSourceByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetDataSourceByName.mockResolvedValue(mockDataSourceData);

    const renderResult = testHook(useFeatureStoreDataSourceByName)(
      'test-project',
      'test-datasource',
    );

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetDataSourceByName).toHaveBeenCalledTimes(1);

    const updatedDataSource: DataSource = mockDataSource({
      name: 'test-datasource',
      project: 'test-project',
      description: 'Updated description',
    });
    mockGetDataSourceByName.mockResolvedValue(updatedDataSource);

    renderResult.result.current.refresh();

    await renderResult.waitForNextUpdate();
    expect(mockGetDataSourceByName).toHaveBeenCalledTimes(2);
    expect(renderResult.result.current.data).toEqual(updatedDataSource);
  });

  it('should handle API availability change', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getDataSourceByName: mockGetDataSourceByName,
      },
      apiAvailable: false,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    const renderResult = testHook(useFeatureStoreDataSourceByName)(
      'test-project',
      'test-datasource',
    );

    await renderResult.waitForNextUpdate();
    expect(renderResult.result.current.data).toEqual(defaultDataSource);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toEqual(new Error('API not yet available'));

    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getDataSourceByName: mockGetDataSourceByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetDataSourceByName.mockResolvedValue(mockDataSourceData);

    renderResult.rerender('test-project', 'test-datasource');

    await renderResult.waitForNextUpdate();
    expect(renderResult.result.current.data).toEqual(mockDataSourceData);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(mockGetDataSourceByName).toHaveBeenCalledTimes(1);
  });

  it('should handle different data source types', async () => {
    const requestSourceDataSource: DataSource = mockDataSource({
      type: 'REQUEST_SOURCE',
      name: 'request-datasource',
      project: 'test-project',
      requestDataOptions: {
        schema: [
          {
            name: 'field1',
            valueType: 'STRING',
            tags: { test: 'true' },
          },
        ],
      },
    });

    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getDataSourceByName: mockGetDataSourceByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetDataSourceByName.mockResolvedValue(requestSourceDataSource);

    const renderResult = testHook(useFeatureStoreDataSourceByName)(
      'test-project',
      'request-datasource',
    );

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(requestSourceDataSource);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should handle empty string parameters as undefined', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getDataSourceByName: mockGetDataSourceByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    const renderResult = testHook(useFeatureStoreDataSourceByName)('', 'test-datasource');

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(defaultDataSource);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toEqual(new Error('Project is required'));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetDataSourceByName).not.toHaveBeenCalled();
  });

  it('should handle project parameter going from defined to undefined', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getDataSourceByName: mockGetDataSourceByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetDataSourceByName.mockResolvedValue(mockDataSourceData);

    const renderResult = testHook(useFeatureStoreDataSourceByName)(
      'test-project',
      'test-datasource',
    );

    await renderResult.waitForNextUpdate();
    expect(mockGetDataSourceByName).toHaveBeenLastCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'test-project',
      'test-datasource',
    );

    renderResult.rerender(undefined, 'test-datasource');

    await renderResult.waitForNextUpdate();
    expect(renderResult.result.current.error).toEqual(new Error('Project is required'));
    expect(mockGetDataSourceByName).toHaveBeenCalledTimes(1);
  });

  it('should handle data source name parameter going from defined to undefined', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getDataSourceByName: mockGetDataSourceByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetDataSourceByName.mockResolvedValue(mockDataSourceData);

    const renderResult = testHook(useFeatureStoreDataSourceByName)(
      'test-project',
      'test-datasource',
    );

    await renderResult.waitForNextUpdate();
    expect(mockGetDataSourceByName).toHaveBeenLastCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'test-project',
      'test-datasource',
    );

    renderResult.rerender('test-project', undefined);

    await renderResult.waitForNextUpdate();
    expect(renderResult.result.current.error).toEqual(new Error('Data source name is required'));
    expect(mockGetDataSourceByName).toHaveBeenCalledTimes(1);
  });
});
