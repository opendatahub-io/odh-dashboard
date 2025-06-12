import { testHook, standardUseFetchState } from '#~/__tests__/unit/testUtils/hooks';
import { MetadataStoreServicePromiseClient, Context } from '#~/third_party/mlmd';
import { MlmdContextTypes } from '#~/concepts/pipelines/apiHooks/mlmd/types';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { GetContextsByTypeResponse } from '#~/third_party/mlmd/generated/ml_metadata/proto/metadata_store_service_pb';
import { useMlmdContextsByType } from '#~/concepts/pipelines/apiHooks/mlmd/useMlmdContextsByType';

// Mock the usePipelinesAPI hook
jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(),
}));

// Mock the getMlmdContext function
jest.mock('#~/concepts/pipelines/apiHooks/mlmd/useMlmdContext', () => ({
  ...jest.requireActual('#~/concepts/pipelines/apiHooks/mlmd/useMlmdContext'),
  getMlmdContext: jest.fn(),
}));

// Mock the MetadataStoreServicePromiseClient
jest.mock('#~/third_party/mlmd', () => {
  const originalModule = jest.requireActual('#~/third_party/mlmd');
  return {
    ...originalModule,
    MetadataStoreServicePromiseClient: jest.fn().mockImplementation(() => ({
      getContextsByType: jest.fn(),
    })),
    GetContextsByTypeRequest: originalModule.GetContextsByTypeRequest,
  };
});

describe('useMlmdContextsByType', () => {
  const mockClient = new MetadataStoreServicePromiseClient('');
  const mockUsePipelinesAPI = jest.mocked(
    usePipelinesAPI as () => Partial<ReturnType<typeof usePipelinesAPI>>,
  );
  const mockGetContextsByType = jest.mocked(mockClient.getContextsByType);

  const mockContext = new Context();
  mockContext.setName('test-context');

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePipelinesAPI.mockReturnValue({
      metadataStoreServiceClient: mockClient,
    });
  });

  it('should return an error when no type is provided', async () => {
    const renderResult = testHook(useMlmdContextsByType)(MlmdContextTypes.RUN);

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState([], false, undefined));
  });

  it('should fetch and return the context', async () => {
    mockGetContextsByType.mockResolvedValue({
      getContextsList: () => [mockContext],
    } as GetContextsByTypeResponse);

    const renderResult = testHook(useMlmdContextsByType)(MlmdContextTypes.RUN);

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState([mockContext], true));
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should handle errors from getMlmdContext', async () => {
    const error = new Error('Test error');
    mockGetContextsByType.mockRejectedValue(error);

    const renderResult = testHook(useMlmdContextsByType)(MlmdContextTypes.RUN);

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState([], false, error));
    expect(renderResult).hookToHaveUpdateCount(2);
  });
});
