import { testHook, standardUseFetchState } from '#~/__tests__/unit/testUtils/hooks';
import {
  MetadataStoreServicePromiseClient,
  GetEventsByArtifactIDsResponse,
  Event,
} from '#~/third_party/mlmd';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { useGetEventByArtifactId } from '#~/concepts/pipelines/apiHooks/mlmd/useGetEventByArtifactId';

jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(),
}));

jest.mock('#~/third_party/mlmd', () => {
  const originalModule = jest.requireActual('#~/third_party/mlmd');
  return {
    ...originalModule,
    MetadataStoreServicePromiseClient: jest.fn().mockImplementation(() => ({
      getEventsByArtifactIDs: jest.fn(),
    })),
    GetEventsByArtifactIDsRequest: originalModule.GetEventsByArtifactIDsRequest,
  };
});

const mockEvent = new Event();
mockEvent.getArtifactId = jest.fn().mockReturnValue(1);
mockEvent.getExecutionId = jest.fn().mockReturnValue(1);

describe('useGetEventByArtifactId', () => {
  const mockClient = new MetadataStoreServicePromiseClient('');
  const mockUsePipelinesAPI = jest.mocked(
    usePipelinesAPI as () => Partial<ReturnType<typeof usePipelinesAPI>>,
  );
  const mockedGetEventsByArtifactIDs = jest.mocked(mockClient.getEventsByArtifactIDs);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePipelinesAPI.mockReturnValue({
      metadataStoreServiceClient: mockClient,
    });
  });

  it('should fetch and return events by artifact ID', async () => {
    mockedGetEventsByArtifactIDs.mockResolvedValue({
      getEventsList: () => [mockEvent],
    } as GetEventsByArtifactIDsResponse);

    const renderResult = testHook(useGetEventByArtifactId)(1);

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(null));
    expect(renderResult).hookToHaveUpdateCount(1);

    //wait for update
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(mockEvent, true));
    expect(renderResult.result.current[0]?.getExecutionId()).toStrictEqual(1);
    expect(renderResult).hookToHaveUpdateCount(2);
    const [request] = mockedGetEventsByArtifactIDs.mock.calls[0];
    expect(request.getArtifactIdsList()).toContain(1);
  });

  it('should handle errors', async () => {
    const error = new Error('Cannot fetch events');
    mockedGetEventsByArtifactIDs.mockRejectedValue(error);

    const renderResult = testHook(useGetEventByArtifactId)(1);

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(null));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(null, false, error));
    expect(renderResult).hookToHaveUpdateCount(2);
  });
});
