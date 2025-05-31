import { testHook, standardUseFetchState } from '#~/__tests__/unit/testUtils/hooks';
import { Artifact, MetadataStoreServicePromiseClient } from '#~/third_party/mlmd';
import {
  usePipelinesAPI,
  useMlmdListContext,
  MlmdListContextProps,
} from '#~/concepts/pipelines/context';
import { useGetArtifactsList } from '#~/concepts/pipelines/apiHooks/mlmd/useGetArtifactsList';
import {
  GetArtifactsRequest,
  GetArtifactsResponse,
} from '#~/third_party/mlmd/generated/ml_metadata/proto/metadata_store_service_pb';
import { ListOperationOptions } from '#~/third_party/mlmd/generated/ml_metadata/proto/metadata_store_pb';

// Mock the usePipelinesAPI hook and useMlmdListContext
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
      getArtifacts: jest.fn(),
    })),
    GetArtifactsRequest: originalModule.GetArtifactsRequest,
  };
});

describe('useGetArtifactsList', () => {
  const mockClient = new MetadataStoreServicePromiseClient('');
  const mockUsePipelinesAPI = jest.mocked(
    usePipelinesAPI as () => Partial<ReturnType<typeof usePipelinesAPI>>,
  );
  const mockUseMlmdListContext = jest.mocked(useMlmdListContext);
  const mockGetArtifacts = jest.mocked(mockClient.getArtifacts);

  const mockArtifact1 = new Artifact();
  mockArtifact1.setId(1);
  mockArtifact1.setName('artifact1');

  const mockArtifact2 = new Artifact();
  mockArtifact2.setId(2);
  mockArtifact2.setName('artifact2');

  const mockArtifacts = [mockArtifact1, mockArtifact2];

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

  it('should fetch and return the artifacts list', async () => {
    mockGetArtifacts.mockResolvedValue({
      getArtifactsList: () => mockArtifacts,
      getNextPageToken: () => 'next-page-token',
    } as GetArtifactsResponse);

    const renderResult = testHook(useGetArtifactsList)();

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(undefined));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();

    const request = new GetArtifactsRequest();
    const listOperationOptions = new ListOperationOptions();
    listOperationOptions.setMaxResultSize(100);
    request.setOptions(listOperationOptions);

    expect(mockGetArtifacts).toHaveBeenCalledWith(request);

    expect(renderResult.result.current).toStrictEqual(
      standardUseFetchState({ artifacts: mockArtifacts, nextPageToken: 'next-page-token' }, true),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should handle errors from getArtifacts', async () => {
    const error = new Error('Cannot fetch artifacts');
    mockGetArtifacts.mockRejectedValue(error);

    const renderResult = testHook(useGetArtifactsList)();

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
