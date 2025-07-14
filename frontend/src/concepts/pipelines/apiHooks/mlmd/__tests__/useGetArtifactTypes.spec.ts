import { testHook, standardUseFetchState } from '#~/__tests__/unit/testUtils/hooks';
import { ArtifactType, MetadataStoreServicePromiseClient } from '#~/third_party/mlmd';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { useGetArtifactTypes } from '#~/concepts/pipelines/apiHooks/mlmd/useGetArtifactTypes';
import { GetArtifactTypesResponse } from '#~/third_party/mlmd/generated/ml_metadata/proto/metadata_store_service_pb';

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
      getArtifactTypes: jest.fn(),
    })),
    GetArtifactTypesRequest: originalModule.GetArtifactTypesRequest,
  };
});

describe('useGetArtifactTypes', () => {
  const mockClient = new MetadataStoreServicePromiseClient('');
  const mockUsePipelinesAPI = jest.mocked(
    usePipelinesAPI as () => Partial<ReturnType<typeof usePipelinesAPI>>,
  );
  const mockGetArtifactTypes = jest.mocked(mockClient.getArtifactTypes);

  const mockArtifactType1 = new ArtifactType();
  mockArtifactType1.setId(1);
  mockArtifactType1.setName('artifactType1');

  const mockArtifactType2 = new ArtifactType();
  mockArtifactType2.setId(2);
  mockArtifactType2.setName('artifactType2');

  const mockArtifactTypes = [mockArtifactType1, mockArtifactType2];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePipelinesAPI.mockReturnValue({
      metadataStoreServiceClient: mockClient,
    });
  });

  it('should fetch and return the artifact types', async () => {
    mockGetArtifactTypes.mockResolvedValue({
      getArtifactTypesList: () => mockArtifactTypes,
    } as GetArtifactTypesResponse);

    const renderResult = testHook(useGetArtifactTypes)();

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(
      standardUseFetchState(mockArtifactTypes, true),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should handle errors from getArtifactTypes', async () => {
    const error = new Error('Cannot fetch artifact types');
    mockGetArtifactTypes.mockRejectedValue(error);

    const renderResult = testHook(useGetArtifactTypes)();

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState([], false, error));
    expect(renderResult).hookToHaveUpdateCount(2);
  });
});
