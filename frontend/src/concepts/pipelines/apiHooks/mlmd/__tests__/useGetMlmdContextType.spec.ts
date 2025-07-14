import { testHook, standardUseFetchState } from '#~/__tests__/unit/testUtils/hooks';
import { MetadataStoreServicePromiseClient, ContextType } from '#~/third_party/mlmd';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { MlmdContextTypes } from '#~/concepts/pipelines/apiHooks/mlmd/types';
import { useGetMlmdContextType } from '#~/concepts/pipelines/apiHooks/mlmd/useGetMlmdContextType';
import { GetContextTypeResponse } from '#~/third_party/mlmd/generated/ml_metadata/proto/metadata_store_service_pb';

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
      getContextType: jest.fn(),
    })),
    GetContextTypeRequest: originalModule.GetContextTypeRequest,
  };
});

describe('useGetMlmdContextType', () => {
  const mockClient = new MetadataStoreServicePromiseClient('');
  const mockUsePipelinesAPI = jest.mocked(
    usePipelinesAPI as () => Partial<ReturnType<typeof usePipelinesAPI>>,
  );
  const mockGetContextType = jest.mocked(mockClient.getContextType);

  const mockContextType = new ContextType();
  mockContextType.setId(1);
  mockContextType.setName('contextType1');

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePipelinesAPI.mockReturnValue({
      metadataStoreServiceClient: mockClient,
    });
  });

  it('should not be loaded when no type is provided', async () => {
    const renderResult = testHook(useGetMlmdContextType)();

    expect(renderResult.result.current).toStrictEqual(
      standardUseFetchState(null, false, undefined),
    );
  });

  it('should fetch and return the context type', async () => {
    mockGetContextType.mockResolvedValue({
      getContextType: () => mockContextType,
    } as GetContextTypeResponse);

    const renderResult = testHook(useGetMlmdContextType)(MlmdContextTypes.RUN);

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(null));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(mockContextType, true));
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should handle errors from getContextType', async () => {
    const error = new Error('Cannot fetch context type');
    mockGetContextType.mockRejectedValue(error);

    const renderResult = testHook(useGetMlmdContextType)(MlmdContextTypes.RUN);

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(null));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(null, false, error));
    expect(renderResult).hookToHaveUpdateCount(2);
  });
});
