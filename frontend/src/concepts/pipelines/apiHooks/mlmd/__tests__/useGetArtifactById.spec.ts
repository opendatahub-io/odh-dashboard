import { standardUseFetchState, testHook } from '@odh-dashboard/jest-config/hooks';
import { Artifact, MetadataStoreServicePromiseClient } from '#~/third_party/mlmd';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { useGetArtifactById } from '#~/concepts/pipelines/apiHooks/mlmd/useGetArtifactById';
import { GetArtifactsByIDResponse } from '#~/third_party/mlmd/generated/ml_metadata/proto/metadata_store_service_pb';

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
      getArtifactsByID: jest.fn(),
    })),
    GetArtifactsByIDRequest: originalModule.GetArtifactsByIDRequest,
  };
});

describe('useGetArtifactById', () => {
  const mockClient = new MetadataStoreServicePromiseClient('');
  const mockUsePipelinesAPI = jest.mocked(
    usePipelinesAPI as () => Partial<ReturnType<typeof usePipelinesAPI>>,
  );
  const mockGetArtifactsByID = jest.mocked(mockClient.getArtifactsByID);

  const mockArtifact = new Artifact();
  mockArtifact.setId(1);
  mockArtifact.setName('test-artifact');

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePipelinesAPI.mockReturnValue({
      metadataStoreServiceClient: mockClient,
    });
  });

  it('should fetch and return the artifact', async () => {
    mockGetArtifactsByID.mockResolvedValue({
      getArtifactsList: () => [mockArtifact],
    } as GetArtifactsByIDResponse);

    const renderResult = testHook(useGetArtifactById)(1);

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(undefined));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(mockArtifact, true));
    expect(renderResult).hookToHaveUpdateCount(2);

    // Check that mockGetArtifactsByID was called with the correct ID
    const [request] = mockGetArtifactsByID.mock.calls[0];
    expect(request.getArtifactIdsList()).toContain(1);
  });

  it('should handle errors from getArtifactsByID', async () => {
    const error = new Error('Cannot find specified artifact');
    mockGetArtifactsByID.mockRejectedValue(error);

    const renderResult = testHook(useGetArtifactById)(1);

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(undefined));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(
      standardUseFetchState(undefined, false, error),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
  });
});
