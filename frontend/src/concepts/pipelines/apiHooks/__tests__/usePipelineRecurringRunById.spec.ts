/* eslint-disable camelcase */
import { standardUseFetchState, testHook } from '@odh-dashboard/jest-config/hooks';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import usePipelineRecurringRunById from '#~/concepts/pipelines/apiHooks/usePipelineRecurringRunById';
import { buildMockRecurringRunKF } from '#~/__mocks__';

jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(),
}));

describe('usePipelineRecurringRunById', () => {
  const mockGetPipelineRecurringRun = jest.fn();
  const mockListPipelineVersions = jest.fn();
  const mockUsePipelinesAPI = usePipelinesAPI as jest.Mock;
  const testPipelineId = 'pipeline-id';

  beforeEach(() => {
    jest.resetAllMocks();
    mockUsePipelinesAPI.mockReturnValue({
      api: {
        getPipelineRecurringRun: mockGetPipelineRecurringRun,
        listPipelineVersions: mockListPipelineVersions,
      },
    });
  });

  it('should not request anything if pipeline id is not provided', async () => {
    const renderResult = testHook(usePipelineRecurringRunById)();
    expect(renderResult).hookToStrictEqual(standardUseFetchState(null));
    expect(mockGetPipelineRecurringRun).not.toHaveBeenCalled();
    expect(mockListPipelineVersions).not.toHaveBeenCalled();
  });

  it('should handle fetch failure gracefully', async () => {
    mockGetPipelineRecurringRun.mockRejectedValue(new Error('Failed to fetch'));

    const renderResult = testHook(usePipelineRecurringRunById)(testPipelineId);
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current[2]).toBeInstanceOf(Error);
    expect(renderResult.result.current[2]?.message).toBe('Failed to fetch');
  });

  it('should fetch recurring run with version ID already set', async () => {
    const testVersionId = 'version-id';
    const mockRecurringRun = buildMockRecurringRunKF({
      pipeline_version_reference: {
        pipeline_id: testPipelineId,
        pipeline_version_id: testVersionId,
      },
    });

    mockGetPipelineRecurringRun.mockResolvedValue(mockRecurringRun);

    const renderResult = testHook(usePipelineRecurringRunById)(testPipelineId);
    await renderResult.waitForNextUpdate();

    expect(mockGetPipelineRecurringRun).toHaveBeenCalledWith(expect.anything(), testPipelineId);
    expect(mockListPipelineVersions).not.toHaveBeenCalled();
    expect(renderResult.result.current[0]).toEqual(mockRecurringRun);
  });

  it('should fetch recurring run and populate missing version ID with latest version', async () => {
    const latestVersionId = 'latest-version-id';
    const mockRecurringRun = buildMockRecurringRunKF({
      pipeline_version_reference: {
        pipeline_id: testPipelineId,
      },
    });

    mockGetPipelineRecurringRun.mockResolvedValue(mockRecurringRun);
    mockListPipelineVersions.mockResolvedValue({
      pipeline_versions: [
        { pipeline_version_id: latestVersionId },
        { pipeline_version_id: 'old-version-id' },
        { pipeline_version_id: 'oldest-version-id' },
      ],
    });

    const renderResult = testHook(usePipelineRecurringRunById)(testPipelineId);
    await renderResult.waitForNextUpdate();

    expect(mockGetPipelineRecurringRun).toHaveBeenCalledWith(expect.anything(), testPipelineId);
    expect(mockListPipelineVersions).toHaveBeenCalledWith(expect.anything(), testPipelineId, {
      sortField: 'created_at',
      sortDirection: 'desc',
    });
    expect(renderResult.result.current[0]?.pipeline_version_reference.pipeline_version_id).toBe(
      latestVersionId,
    );
  });
});
