import { standardUseFetchState, testHook } from '@odh-dashboard/jest-config/hooks';
import { Execution, MetadataStoreServicePromiseClient } from '#~/third_party/mlmd';
import {
  MlmdListContextProps,
  useMlmdListContext,
  usePipelinesAPI,
} from '#~/concepts/pipelines/context';
import { useGetExecutionsList } from '#~/concepts/pipelines/apiHooks/mlmd/useGetExecutionsList';
import {
  GetExecutionsRequest,
  GetExecutionsResponse,
} from '#~/third_party/mlmd/generated/ml_metadata/proto/metadata_store_service_pb';
import { ListOperationOptions } from '#~/third_party/mlmd/generated/ml_metadata/proto/metadata_store_pb';

// Mock the usePipelinesAPI and useMlmdListContext hooks
jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(),
  useMlmdListContext: jest.fn(),
}));

// Mock the MetadataStoreServicePromiseClient
jest.mock('#~/third_party/mlmd', () => {
  const originalModule = jest.requireActual('#~/third_party/mlmd');
  return {
    ...originalModule,
    MetadataStoreServicePromiseClient: jest.fn().mockImplementation(() => ({
      getExecutions: jest.fn(),
    })),
    GetExecutionsRequest: originalModule.GetExecutionsRequest,
  };
});

describe('useGetExecutionsList', () => {
  const mockClient = new MetadataStoreServicePromiseClient('');
  const mockUsePipelinesAPI = jest.mocked(
    usePipelinesAPI as () => Partial<ReturnType<typeof usePipelinesAPI>>,
  );
  const mockUseMlmdListContext = jest.mocked(useMlmdListContext);
  const mockGetExecutions = jest.mocked(mockClient.getExecutions);

  const mockExecution1 = new Execution();
  mockExecution1.setId(1);
  mockExecution1.setName('execution1');

  const mockExecution2 = new Execution();
  mockExecution2.setId(2);
  mockExecution2.setName('execution2');

  const mockExecutions = [mockExecution1, mockExecution2];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePipelinesAPI.mockReturnValue({
      metadataStoreServiceClient: mockClient,
    });
    mockUseMlmdListContext.mockReturnValue({
      pageToken: '',
      maxResultSize: 100,
      filterQuery: '',
    } as MlmdListContextProps);
  });

  it('should fetch and return the executions list', async () => {
    mockGetExecutions.mockResolvedValue({
      getExecutionsList: () => mockExecutions,
      getNextPageToken: () => 'next-page-token',
    } as GetExecutionsResponse);

    const renderResult = testHook(useGetExecutionsList)();

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(null));
    expect(renderResult).hookToHaveUpdateCount(1);

    const request = new GetExecutionsRequest();
    const listOperationOptions = new ListOperationOptions();
    listOperationOptions.setOrderByField(
      new ListOperationOptions.OrderByField().setField(ListOperationOptions.OrderByField.Field.ID),
    );
    listOperationOptions.setMaxResultSize(100);
    request.setOptions(listOperationOptions);

    expect(mockGetExecutions).toHaveBeenCalledWith(request);

    // wait for update
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(
      standardUseFetchState({ executions: mockExecutions, nextPageToken: 'next-page-token' }, true),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should handle errors from getExecutions', async () => {
    const error = new Error('Cannot fetch executions');
    mockGetExecutions.mockRejectedValue(error);

    const renderResult = testHook(useGetExecutionsList)();

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(null));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(null, false, error));
    expect(renderResult).hookToHaveUpdateCount(2);
  });
});
