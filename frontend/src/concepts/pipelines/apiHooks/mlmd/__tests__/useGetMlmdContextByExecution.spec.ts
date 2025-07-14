import { testHook, standardUseFetchState } from '#~/__tests__/unit/testUtils/hooks';
import {
  MetadataStoreServicePromiseClient,
  Execution,
  Context,
  ContextType,
} from '#~/third_party/mlmd';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { useGetMlmdContextType } from '#~/concepts/pipelines/apiHooks/mlmd/useGetMlmdContextType';
import { useGetPipelineRunContextByExecution } from '#~/concepts/pipelines/apiHooks/mlmd/useGetMlmdContextByExecution';
import { GetContextsByExecutionResponse } from '#~/third_party/mlmd/generated/ml_metadata/proto/metadata_store_service_pb';

// Mock the usePipelinesAPI and useGetMlmdContextType hooks
jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(),
}));

jest.mock('#~/concepts/pipelines/apiHooks/mlmd/useGetMlmdContextType', () => ({
  useGetMlmdContextType: jest.fn(),
}));

// Mock the MetadataStoreServicePromiseClient
jest.mock('#~/third_party/mlmd', () => {
  const originalModule = jest.requireActual('#~/third_party/mlmd');
  return {
    ...originalModule,
    MetadataStoreServicePromiseClient: jest.fn().mockImplementation(() => ({
      getContextsByExecution: jest.fn(),
    })),
    GetContextsByExecutionRequest: originalModule.GetContextsByExecutionRequest,
  };
});

describe('useGetPipelineRunContextByExecution', () => {
  const mockClient = new MetadataStoreServicePromiseClient('');
  const mockUsePipelinesAPI = jest.mocked(
    usePipelinesAPI as () => Partial<ReturnType<typeof usePipelinesAPI>>,
  );
  const mockUseGetMlmdContextType = jest.mocked(useGetMlmdContextType);
  const mockGetContextsByExecution = jest.mocked(mockClient.getContextsByExecution);

  const mockExecution = new Execution();
  mockExecution.setId(1);

  const mockContext = new Context();
  mockContext.setTypeId(1);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePipelinesAPI.mockReturnValue({
      metadataStoreServiceClient: mockClient,
    });
    mockUseGetMlmdContextType.mockReturnValue(
      standardUseFetchState(
        {
          getId: () => 1,
        } as ContextType,
        false,
      ),
    );
  });

  it('should fetch and return the context by execution', async () => {
    mockGetContextsByExecution.mockResolvedValue({
      getContextsList: () => [mockContext],
    } as GetContextsByExecutionResponse);

    const renderResult = testHook(useGetPipelineRunContextByExecution)(mockExecution.getId());

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(null));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(mockContext, true));
    expect(renderResult).hookToHaveUpdateCount(2);

    // Check that mockGetContextsByExecution was called with the correct execution ID
    const [request] = mockGetContextsByExecution.mock.calls[0];
    expect(request.getExecutionId()).toBe(1);
  });

  it('should handle errors from getContextsByExecution', async () => {
    const error = new Error('Cannot fetch contexts');
    mockGetContextsByExecution.mockRejectedValue(error);

    const renderResult = testHook(useGetPipelineRunContextByExecution)(mockExecution.getId());

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(null));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(null, false, error));
    expect(renderResult).hookToHaveUpdateCount(2);
  });
});
