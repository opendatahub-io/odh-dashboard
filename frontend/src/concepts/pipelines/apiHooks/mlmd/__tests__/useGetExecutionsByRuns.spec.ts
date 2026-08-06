import { standardUseFetchState, testHook } from '@odh-dashboard/jest-config/hooks';
import { Execution, Context, MetadataStoreServicePromiseClient } from '#~/third_party/mlmd';
import { GetExecutionsByContextResponse } from '#~/third_party/mlmd/generated/ml_metadata/proto/metadata_store_service_pb';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { useGetExecutionsByRuns } from '#~/concepts/pipelines/apiHooks/mlmd/useGetExecutionsByRuns';
import { buildMockRunKF } from '#~/__mocks__/mockRunKF';

jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(),
}));

jest.mock('#~/third_party/mlmd', () => {
  const originalModule = jest.requireActual('#~/third_party/mlmd');
  return {
    ...originalModule,
    MetadataStoreServicePromiseClient: jest.fn().mockImplementation(() => ({
      getExecutionsByContext: jest.fn(),
    })),
  };
});

describe('useGetExecutionsByRuns', () => {
  const mockClient = new MetadataStoreServicePromiseClient('');
  const mockUsePipelinesAPI = jest.mocked(
    usePipelinesAPI as () => Partial<ReturnType<typeof usePipelinesAPI>>,
  );
  const mockGetExecutionsByContext = jest.mocked(mockClient.getExecutionsByContext);

  // eslint-disable-next-line camelcase
  const mockRun1 = buildMockRunKF({ run_id: 'run-1' });
  // eslint-disable-next-line camelcase
  const mockRun2 = buildMockRunKF({ run_id: 'run-2' });

  const context1 = new Context();
  context1.setId(1);
  context1.setName('run-1');

  const context2 = new Context();
  context2.setId(2);
  context2.setName('run-2');

  const exec1 = new Execution();
  exec1.setId(10);
  const exec2 = new Execution();
  exec2.setId(20);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePipelinesAPI.mockReturnValue({
      metadataStoreServiceClient: mockClient,
    });
  });

  it('should fetch executions grouped by run ID', async () => {
    mockGetExecutionsByContext
      .mockResolvedValueOnce({
        getExecutionsList: () => [exec1],
      } as GetExecutionsByContextResponse)
      .mockResolvedValueOnce({
        getExecutionsList: () => [exec2],
      } as GetExecutionsByContextResponse);

    const renderResult = testHook(useGetExecutionsByRuns)(
      [mockRun1, mockRun2],
      [context1, context2],
    );

    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual(
      standardUseFetchState([{ 'run-1': [exec1] }, { 'run-2': [exec2] }], true),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should return empty array for run without matching context', async () => {
    mockGetExecutionsByContext.mockResolvedValueOnce({
      getExecutionsList: () => [exec1],
    } as GetExecutionsByContextResponse);

    const noMatchContext = new Context();
    noMatchContext.setId(99);
    noMatchContext.setName('other-run');

    const renderResult = testHook(useGetExecutionsByRuns)([mockRun1, mockRun2], [noMatchContext]);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current[0]).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({ 'run-1': [] }),
        expect.objectContaining({ 'run-2': [] }),
      ]),
    );
  });

  it('should not fetch when runs are empty', () => {
    const renderResult = testHook(useGetExecutionsByRuns)([], [context1]);

    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);
    expect(mockGetExecutionsByContext).not.toHaveBeenCalled();
  });

  it('should not fetch when contexts are empty', () => {
    const renderResult = testHook(useGetExecutionsByRuns)([mockRun1], []);

    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);
    expect(mockGetExecutionsByContext).not.toHaveBeenCalled();
  });
});
