/* eslint-disable camelcase */
import { standardUseFetchState, testHook } from '@odh-dashboard/jest-config/hooks';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { PipelineArtifactTypeKF } from '#~/concepts/pipelines/kfTypes';
import { useGetArtifactById } from '#~/concepts/pipelines/apiHooks/useGetArtifactById';

jest.mock('#~/concepts/pipelines/context', () => ({ usePipelinesAPI: jest.fn() }));

describe('useGetArtifactById', () => {
  const getArtifactResource = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(usePipelinesAPI).mockReturnValue({
      api: { getArtifactResource },
    } as unknown as ReturnType<typeof usePipelinesAPI>);
  });

  it('should retrieve the REST resource using its string artifact ID', async () => {
    const artifact = {
      artifact_id: 'artifact-uuid',
      name: 'my-artifact',
      type: PipelineArtifactTypeKF.ARTIFACT,
      metadata: { count: 0 },
    };
    getArtifactResource.mockResolvedValue(artifact);
    const result = testHook(useGetArtifactById)('artifact-uuid');
    await result.waitForNextUpdate();
    expect(getArtifactResource).toHaveBeenCalledWith(expect.anything(), 'artifact-uuid');
    expect(result.result.current).toStrictEqual(standardUseFetchState(artifact, true));
    expect(result).hookToHaveUpdateCount(2);
  });

  it('should surface API errors without consulting MLMD', async () => {
    const error = new Error('Artifact not found');
    getArtifactResource.mockRejectedValue(error);
    const result = testHook(useGetArtifactById)('missing');
    await result.waitForNextUpdate();
    expect(result.result.current).toStrictEqual(standardUseFetchState(undefined, false, error));
  });

  it('should report invalid resource IDs when the API wrapper throws synchronously', async () => {
    getArtifactResource.mockImplementation(() => {
      throw new Error('Invalid pipeline resource id');
    });
    const result = testHook(useGetArtifactById)('invalid/id');
    await result.waitForNextUpdate();
    expect(result.result.current).toStrictEqual(
      standardUseFetchState(undefined, false, new Error('Invalid pipeline resource id')),
    );
  });
});
