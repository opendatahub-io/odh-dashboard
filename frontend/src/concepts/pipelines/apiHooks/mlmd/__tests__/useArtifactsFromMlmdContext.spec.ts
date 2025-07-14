import { testHook, standardUseFetchState } from '#~/__tests__/unit/testUtils/hooks';
import { Artifact, Context, MetadataStoreServicePromiseClient } from '#~/third_party/mlmd';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { useArtifactsFromMlmdContext } from '#~/concepts/pipelines/apiHooks/mlmd/useArtifactsFromMlmdContext';
import { GetArtifactsByContextResponse } from '#~/third_party/mlmd/generated/ml_metadata/proto/metadata_store_service_pb';

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
      getArtifactsByContext: jest.fn(),
    })),
  };
});

describe('useArtifactsFromMlmdContext', () => {
  const mockClient = new MetadataStoreServicePromiseClient('');
  const mockUsePipelinesAPI = jest.mocked(
    usePipelinesAPI as () => Partial<ReturnType<typeof usePipelinesAPI>>,
  );
  const mockGetArtifactsByContext = jest.mocked(mockClient.getArtifactsByContext);

  const mockedContext = new Context();
  mockedContext.setId(1);

  const artifact1 = new Artifact();
  artifact1.setId(1);
  const artifact2 = new Artifact();
  artifact2.setId(2);
  const mockArtifacts = [artifact1, artifact2];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePipelinesAPI.mockReturnValue({
      metadataStoreServiceClient: mockClient,
    });
  });

  it('should fetch and return artifacts', async () => {
    mockGetArtifactsByContext.mockResolvedValue({
      getArtifactsList: () => mockArtifacts,
    } as GetArtifactsByContextResponse);

    const renderResult = testHook(useArtifactsFromMlmdContext)(mockedContext);

    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(mockArtifacts, true));
    expect(renderResult).hookToHaveUpdateCount(2);

    // Check that mockGetArtifactsByContext was called with the correct context ID
    const [request] = mockGetArtifactsByContext.mock.calls[0];
    expect(request.getContextId()).toBe(mockedContext.getId());
  });

  it('should handle errors from getArtifactsByContext', async () => {
    const error = new Error('Cannot find artifacts');
    mockGetArtifactsByContext.mockRejectedValue(error);

    const renderResult = testHook(useArtifactsFromMlmdContext)(mockedContext);

    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState([], false, error));
    expect(renderResult).hookToHaveUpdateCount(2);
  });
});
