/* eslint-disable camelcase */
import { testHook } from '#~/__tests__/unit/testUtils/hooks';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import usePipelineRecurringRuns from '#~/concepts/pipelines/apiHooks/usePipelineRecurringRuns';
import { buildMockRecurringRunKF } from '#~/__mocks__';

jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(),
}));

describe('usePipelineRecurringRuns', () => {
  const mockListPipelineRecurringRuns = jest.fn();
  const mockListPipelineVersions = jest.fn();
  const mockUsePipelinesAPI = usePipelinesAPI as jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
    mockUsePipelinesAPI.mockReturnValue({
      api: {
        listPipelineRecurringRuns: mockListPipelineRecurringRuns,
        listPipelineVersions: mockListPipelineVersions,
      },
    });
  });

  it('should return emtpy list when there are no recurring runs', async () => {
    mockListPipelineRecurringRuns.mockResolvedValue({});

    const renderResult = testHook(usePipelineRecurringRuns)();
    await renderResult.waitForNextUpdate();

    expect(mockListPipelineRecurringRuns).toHaveBeenCalled();
    expect(renderResult.result.current[0].items).toStrictEqual([]);
  });

  it('should include experimentId in request if provided in options', async () => {
    const options = { experimentId: 'experiment-id' };
    mockListPipelineRecurringRuns.mockResolvedValue({ recurringRuns: [] });

    const renderResult = testHook(usePipelineRecurringRuns)(options);
    await renderResult.waitForNextUpdate();

    expect(mockListPipelineRecurringRuns).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        experimentId: options.experimentId,
      }),
    );
  });

  it('should handle fetch error', async () => {
    mockListPipelineRecurringRuns.mockRejectedValue(new Error('Failed to fetch'));

    const renderResult = testHook(usePipelineRecurringRuns)();
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current[2]).toBeInstanceOf(Error);
    expect(renderResult.result.current[2]?.message).toBe('Failed to fetch');
  });

  it('should fetch recurring runs with versions already set', async () => {
    const recurringRuns = [
      buildMockRecurringRunKF({
        pipeline_version_reference: {
          pipeline_id: 'pipeline-id-1',
          pipeline_version_id: 'version-id-1',
        },
      }),
      buildMockRecurringRunKF({
        pipeline_version_reference: {
          pipeline_id: 'pipeline-id-2',
          pipeline_version_id: 'version-id-2',
        },
      }),
    ];

    mockListPipelineRecurringRuns.mockResolvedValue({ recurringRuns });

    const renderResult = testHook(usePipelineRecurringRuns)();
    await renderResult.waitForNextUpdate();

    expect(mockListPipelineRecurringRuns).toHaveBeenCalled();
    expect(mockListPipelineVersions).not.toHaveBeenCalled();
    expect(renderResult.result.current[0].items).toEqual(recurringRuns);
  });

  it('should fetch and populate missing version IDs', async () => {
    const pipelineId = 'pipeline-id';
    const latestVersionId = 'latest-version-id';

    const recurringRuns = [
      buildMockRecurringRunKF({
        pipeline_version_reference: {
          pipeline_id: pipelineId,
        },
      }),
    ];

    mockListPipelineRecurringRuns.mockResolvedValue({ recurringRuns });
    mockListPipelineVersions.mockResolvedValue({
      pipeline_versions: [{ pipeline_version_id: latestVersionId }],
    });

    const renderResult = testHook(usePipelineRecurringRuns)();
    await renderResult.waitForNextUpdate();

    expect(mockListPipelineRecurringRuns).toHaveBeenCalled();
    expect(mockListPipelineVersions).toHaveBeenCalledWith(expect.anything(), pipelineId, {
      sortField: 'created_at',
      sortDirection: 'desc',
    });

    expect(
      renderResult.result.current[0].items[0].pipeline_version_reference.pipeline_version_id,
    ).toBe(latestVersionId);
  });
});
