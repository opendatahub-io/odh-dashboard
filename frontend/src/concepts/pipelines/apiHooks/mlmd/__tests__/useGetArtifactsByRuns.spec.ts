import { testHook, standardUseFetchState } from '#~/__tests__/unit/testUtils/hooks';
import {
  MetadataStoreServicePromiseClient,
  Artifact,
  Execution,
  Event,
  Context,
} from '#~/third_party/mlmd';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { PipelineRunKF } from '#~/concepts/pipelines/kfTypes';
import {
  GetArtifactsByContextResponse,
  GetExecutionsByContextResponse,
  GetEventsByExecutionIDsResponse,
} from '#~/third_party/mlmd/generated/ml_metadata/proto/metadata_store_service_pb';
import { useGetArtifactsByRuns } from '#~/concepts/pipelines/apiHooks/mlmd/useGetArtifactsByRuns';

// Mock the usePipelinesAPI and getMlmdContext hooks
jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(),
}));

jest.mock('#~/concepts/pipelines/apiHooks/mlmd/useMlmdContext', () => ({
  getMlmdContext: jest.fn(),
}));

// Mock the MetadataStoreServicePromiseClient
jest.mock('#~/third_party/mlmd', () => {
  const originalModule = jest.requireActual('#~/third_party/mlmd');
  return {
    ...originalModule,
    MetadataStoreServicePromiseClient: jest.fn().mockImplementation(() => ({
      getArtifactsByContext: jest.fn(),
      getExecutionsByContext: jest.fn(),
      getEventsByExecutionIDs: jest.fn(),
    })),
    GetArtifactsByContextRequest: originalModule.GetArtifactsByContextRequest,
    GetExecutionsByContextRequest: originalModule.GetExecutionsByContextRequest,
    GetEventsByExecutionIDsRequest: originalModule.GetEventsByExecutionIDsRequest,
  };
});

describe('useGetArtifactsByRuns', () => {
  const mockClient = new MetadataStoreServicePromiseClient('');
  const mockUsePipelinesAPI = jest.mocked(
    usePipelinesAPI as () => Partial<ReturnType<typeof usePipelinesAPI>>,
  );
  const mockGetArtifactsByContext = jest.mocked(mockClient.getArtifactsByContext);
  const mockGetExecutionsByContext = jest.mocked(mockClient.getExecutionsByContext);
  const mockGetEventsByExecutionIDs = jest.mocked(mockClient.getEventsByExecutionIDs);

  const mockContext = new Context();
  mockContext.setId(1);
  mockContext.setName('test-run-id');

  const mockArtifact = new Artifact();
  mockArtifact.setId(1);
  mockArtifact.setName('artifact1');

  const mockExecution = new Execution();
  mockExecution.setId(1);

  const mockEvent = new Event();
  mockEvent.getArtifactId = jest.fn().mockReturnValue(1);
  mockEvent.getExecutionId = jest.fn().mockReturnValue(1);

  // eslint-disable-next-line camelcase
  const mockRun = { run_id: 'test-run-id' } as PipelineRunKF;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePipelinesAPI.mockReturnValue({
      metadataStoreServiceClient: mockClient,
    });
  });

  it('throws error when no MLMD context is found', async () => {
    const mockInvalidContext = new Context();
    mockInvalidContext.setName('test-invalid-id');

    const renderResult = testHook(useGetArtifactsByRuns)([mockRun], [mockInvalidContext]);

    // wait for update
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toEqual(
      standardUseFetchState([], false, new Error('No context for run: test-run-id')),
    );
  });

  it('should fetch and return MLMD packages for pipeline runs', async () => {
    mockGetArtifactsByContext.mockResolvedValue({
      getArtifactsList: () => [mockArtifact],
    } as GetArtifactsByContextResponse);
    mockGetExecutionsByContext.mockResolvedValue({
      getExecutionsList: () => [mockExecution],
    } as GetExecutionsByContextResponse);
    mockGetEventsByExecutionIDs.mockResolvedValue({
      getEventsList: () => [mockEvent],
    } as GetEventsByExecutionIDsResponse);

    const renderResult = testHook(useGetArtifactsByRuns)([mockRun], [mockContext]);

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(
      standardUseFetchState(
        [
          {
            [mockRun.run_id]: [mockArtifact],
          },
        ],
        true,
      ),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should handle errors from getArtifactsByContext', async () => {
    const error = new Error('Cannot fetch artifacts');
    mockGetArtifactsByContext.mockRejectedValue(error);

    const renderResult = testHook(useGetArtifactsByRuns)([mockRun], [mockContext]);

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(standardUseFetchState([], false, error));
    expect(renderResult).hookToHaveUpdateCount(2);
  });
});
