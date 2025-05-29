import { testHook, standardUseFetchState } from '#~/__tests__/unit/testUtils/hooks';
import { Execution, MetadataStoreServicePromiseClient } from '#~/third_party/mlmd';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { useGetExecutionById } from '#~/concepts/pipelines/apiHooks/mlmd/useGetExecutionById';
import { GetExecutionsByIDResponse } from '#~/third_party/mlmd/generated/ml_metadata/proto/metadata_store_service_pb';

// Mock the usePipelinesAPI hook
jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(),
}));

// Mock the MetadataStoreServicePromiseClient
jest.mock('#~/third_party/mlmd', () => {
  const originalModule = jest.requireActual('#~/third_party/mlmd');
  return {
    ...originalModule,
    MetadataStoreServicePromiseClient: jest.fn().mockImplementation(() => ({
      getExecutionsByID: jest.fn(),
    })),
    GetExecutionsByIDRequest: originalModule.GetExecutionsByIDRequest,
  };
});

describe('useGetExecutionById', () => {
  const mockClient = new MetadataStoreServicePromiseClient('');
  const mockUsePipelinesAPI = jest.mocked(
    usePipelinesAPI as () => Partial<ReturnType<typeof usePipelinesAPI>>,
  );
  const mockGetExecutionsByID = jest.mocked(mockClient.getExecutionsByID);

  const mockExecution = new Execution();
  mockExecution.setId(1);
  mockExecution.setName('execution1');

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePipelinesAPI.mockReturnValue({
      metadataStoreServiceClient: mockClient,
    });
  });

  it('should return null if no executionId is provided', async () => {
    const renderResult = testHook(useGetExecutionById)();

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(null, true));
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should return null if executionId is NaN', async () => {
    const renderResult = testHook(useGetExecutionById)('not-a-number');

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(null, true));
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should fetch and return the execution by ID', async () => {
    mockGetExecutionsByID.mockResolvedValue({
      getExecutionsList: () => [mockExecution],
    } as GetExecutionsByIDResponse);

    const renderResult = testHook(useGetExecutionById)('1');

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(null));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(mockExecution, true));
    expect(renderResult).hookToHaveUpdateCount(2);

    // Check that mockGetExecutionsByID was called with the correct execution ID
    const [request] = mockGetExecutionsByID.mock.calls[0];
    expect(request.getExecutionIdsList()).toContain(1);
  });

  it('should handle errors from getExecutionsByID', async () => {
    const error = new Error('Cannot fetch execution');
    mockGetExecutionsByID.mockRejectedValue(error);

    const renderResult = testHook(useGetExecutionById)('1');

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(null));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(null, false, error));
    expect(renderResult).hookToHaveUpdateCount(2);
  });
});
