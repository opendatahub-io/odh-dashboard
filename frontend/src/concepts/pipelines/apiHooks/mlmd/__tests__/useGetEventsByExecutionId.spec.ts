import { testHook, standardUseFetchState } from '#~/__tests__/unit/testUtils/hooks';
import {
  MetadataStoreServicePromiseClient,
  GetEventsByExecutionIDsResponse,
} from '#~/third_party/mlmd';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import {
  useGetEventsByExecutionId,
  useGetEventsByExecutionIds,
} from '#~/concepts/pipelines/apiHooks/mlmd/useGetEventsByExecutionId';

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
      getEventsByExecutionIDs: jest.fn(),
    })),
    GetEventsByExecutionIDsRequest: originalModule.GetEventsByExecutionIDsRequest,
  };
});

describe('useGetEventsByExecutionId', () => {
  const mockClient = new MetadataStoreServicePromiseClient('');
  const mockUsePipelinesAPI = jest.mocked(
    usePipelinesAPI as () => Partial<ReturnType<typeof usePipelinesAPI>>,
  );
  const mockGetEventsByExecutionIDs = jest.mocked(mockClient.getEventsByExecutionIDs);

  const mockEventsResponse = new GetEventsByExecutionIDsResponse();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePipelinesAPI.mockReturnValue({
      metadataStoreServiceClient: mockClient,
    });
  });

  it('should fetch and return events by execution ID', async () => {
    mockGetEventsByExecutionIDs.mockResolvedValue(mockEventsResponse);

    const renderResult = testHook(useGetEventsByExecutionId)(1);

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(null));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(
      standardUseFetchState(mockEventsResponse.getEventsList(), true),
    );
    expect(renderResult).hookToHaveUpdateCount(2);

    // Check that mockGetEventsByExecutionIDs was called with the correct execution ID
    const [request] = mockGetEventsByExecutionIDs.mock.calls[0];
    expect(request.getExecutionIdsList()).toContain(1);
  });

  it('should handle errors from getEventsByExecutionIDs', async () => {
    const error = new Error('Cannot fetch events');
    mockGetEventsByExecutionIDs.mockRejectedValue(error);

    const renderResult = testHook(useGetEventsByExecutionId)(1);

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(null));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(null, false, error));
    expect(renderResult).hookToHaveUpdateCount(2);
  });
});

describe('useGetEventsByExecutionIds', () => {
  const mockClient = new MetadataStoreServicePromiseClient('');
  const mockUsePipelinesAPI = jest.mocked(
    usePipelinesAPI as () => Partial<ReturnType<typeof usePipelinesAPI>>,
  );
  const mockGetEventsByExecutionIDs = jest.mocked(mockClient.getEventsByExecutionIDs);

  const mockEventsResponse = new GetEventsByExecutionIDsResponse();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePipelinesAPI.mockReturnValue({
      metadataStoreServiceClient: mockClient,
    });
  });

  it('should fetch and return events by execution IDs', async () => {
    mockGetEventsByExecutionIDs.mockResolvedValue(mockEventsResponse);

    const renderResult = testHook(useGetEventsByExecutionIds)([1, 2]);

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(null));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(
      standardUseFetchState(mockEventsResponse.getEventsList(), true),
    );
    expect(renderResult).hookToHaveUpdateCount(2);

    // Check that mockGetEventsByExecutionIDs was called with the correct execution IDs
    const [request] = mockGetEventsByExecutionIDs.mock.calls[0];
    expect(request.getExecutionIdsList()).toEqual([1, 2]);
  });

  it('should handle errors from getEventsByExecutionIDs', async () => {
    const error = new Error('Cannot fetch events');
    mockGetEventsByExecutionIDs.mockRejectedValue(error);

    const renderResult = testHook(useGetEventsByExecutionIds)([1, 2]);

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(null));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(null, false, error));
    expect(renderResult).hookToHaveUpdateCount(2);
  });
});
