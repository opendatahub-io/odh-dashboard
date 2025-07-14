import { standardUseFetchState, testHook } from '@odh-dashboard/jest-config/hooks';
import { Execution, Context, MetadataStoreServicePromiseClient } from '#~/third_party/mlmd';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { useExecutionsFromMlmdContext } from '#~/concepts/pipelines/apiHooks/mlmd/useExecutionsFromMlmdContext';
import { GetExecutionsByContextResponse } from '#~/third_party/mlmd/generated/ml_metadata/proto/metadata_store_service_pb';

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
      getExecutionsByContext: jest.fn(),
    })),
  };
});

describe('useExecutionsFromMlmdContext', () => {
  const mockClient = new MetadataStoreServicePromiseClient('');
  const mockUsePipelinesAPI = jest.mocked(
    usePipelinesAPI as () => Partial<ReturnType<typeof usePipelinesAPI>>,
  );
  const mockGetExecutionsByContext = jest.mocked(mockClient.getExecutionsByContext);

  const mockedContext = new Context();
  mockedContext.setId(1);

  const execution1 = new Execution();
  execution1.setId(1);
  const execution2 = new Execution();
  execution2.setId(2);
  const mockExecutions = [execution1, execution2];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePipelinesAPI.mockReturnValue({
      metadataStoreServiceClient: mockClient,
    });
  });

  it('should fetch and return executions', async () => {
    mockGetExecutionsByContext.mockResolvedValue({
      getExecutionsList: () => mockExecutions,
    } as GetExecutionsByContextResponse);

    const renderResult = testHook(useExecutionsFromMlmdContext)(mockedContext);

    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(mockExecutions, true));
    expect(renderResult).hookToHaveUpdateCount(2);

    // Check that mockGetExecutionsByContext was called with the correct context ID
    const [request] = mockGetExecutionsByContext.mock.calls[0];
    expect(request.getContextId()).toBe(mockedContext.getId());
  });

  it('should handle errors from getExecutionsByContext', async () => {
    const error = new Error('Cannot find executions');
    mockGetExecutionsByContext.mockRejectedValue(error);

    const renderResult = testHook(useExecutionsFromMlmdContext)(mockedContext);

    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState([], false, error));
    expect(renderResult).hookToHaveUpdateCount(2);
  });
});
