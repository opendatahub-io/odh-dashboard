import { testHook, standardUseFetchState } from '#~/__tests__/unit/testUtils/hooks';
import { MetadataStoreServicePromiseClient, Event, Artifact } from '#~/third_party/mlmd';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { useGetLinkedArtifactsByEvents } from '#~/concepts/pipelines/apiHooks/mlmd/useGetLinkedArtifactsByEvents';
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

describe('useGetLinkedArtifactsByEvents', () => {
  const mockClient = new MetadataStoreServicePromiseClient('');
  const mockUsePipelinesAPI = jest.mocked(
    usePipelinesAPI as () => Partial<ReturnType<typeof usePipelinesAPI>>,
  );
  const mockGetArtifactsByID = jest.mocked(mockClient.getArtifactsByID);

  const mockArtifact = new Artifact();
  mockArtifact.setId(1);
  mockArtifact.setName('artifact1');

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePipelinesAPI.mockReturnValue({
      metadataStoreServiceClient: mockClient,
    });
  });

  it('should return an empty array if no events have artifact IDs', async () => {
    const renderResult = testHook(useGetLinkedArtifactsByEvents)([]);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState([], true));
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should fetch and return linked artifacts by events', async () => {
    const mockEvent = new Event();
    mockEvent.getArtifactId = jest.fn().mockReturnValue(1);

    mockGetArtifactsByID.mockResolvedValue({
      getArtifactsList: () => [mockArtifact],
    } as GetArtifactsByIDResponse);

    const renderResult = testHook(useGetLinkedArtifactsByEvents)([mockEvent]);

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(
      standardUseFetchState([{ event: mockEvent, artifact: mockArtifact }], true),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should handle errors from getArtifactsByID', async () => {
    const error = new Error('Cannot fetch artifacts');
    mockGetArtifactsByID.mockRejectedValue(error);

    const mockEvent = new Event();
    mockEvent.getArtifactId = jest.fn().mockReturnValue(1);

    const renderResult = testHook(useGetLinkedArtifactsByEvents)([mockEvent]);

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState([], false, error));
    expect(renderResult).hookToHaveUpdateCount(2);
  });
});
