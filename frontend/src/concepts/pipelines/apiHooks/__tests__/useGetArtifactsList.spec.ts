/* eslint-disable camelcase */
import { standardUseFetchState, testHook } from '@odh-dashboard/jest-config/hooks';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { PipelineArtifactTypeKF } from '#~/concepts/pipelines/kfTypes';
import { useGetArtifactsList } from '#~/concepts/pipelines/apiHooks/useGetArtifactsList';

jest.mock('#~/concepts/pipelines/context', () => ({ usePipelinesAPI: jest.fn() }));

describe('useGetArtifactsList', () => {
  const listArtifactResources = jest.fn();
  const usePipelinesAPIMock = jest.mocked(usePipelinesAPI);

  beforeEach(() => {
    jest.clearAllMocks();
    usePipelinesAPIMock.mockReturnValue({
      namespace: 'project-a',
      api: { listArtifactResources },
    } as unknown as ReturnType<typeof usePipelinesAPI>);
  });

  it('should list namespace artifacts with KFP pagination, sort, and filter parameters', async () => {
    const response = {
      artifacts: [{ artifact_id: 'uuid-1', name: 'dataset', type: PipelineArtifactTypeKF.DATASET }],
      next_page_token: 'next-page',
    };
    listArtifactResources.mockResolvedValue(response);

    const result = testHook(useGetArtifactsList)('current-page', 20, '{"predicates":[]}');
    expect(result).hookToHaveUpdateCount(1);
    await result.waitForNextUpdate();

    expect(listArtifactResources).toHaveBeenCalledWith(expect.anything(), {
      namespace: 'project-a',
      pageSize: 20,
      pageToken: 'current-page',
      sortBy: 'created_at desc',
      filter: '{"predicates":[]}',
    });
    expect(result.result.current).toStrictEqual(standardUseFetchState(response, true));
    expect(result).hookToHaveUpdateCount(2);
  });

  it('should surface API errors', async () => {
    const error = new Error('Access denied');
    listArtifactResources.mockRejectedValue(error);
    const result = testHook(useGetArtifactsList)();
    await result.waitForNextUpdate();
    expect(result.result.current).toStrictEqual(standardUseFetchState(undefined, false, error));
  });
});
