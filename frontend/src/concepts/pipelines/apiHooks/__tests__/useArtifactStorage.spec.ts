/* eslint-disable camelcase */
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { Artifact } from '~/third_party/mlmd';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { useArtifactStorage } from '~/concepts/pipelines/apiHooks/useArtifactStorage';

global.fetch = jest.fn();
const mockFetch = jest.mocked(global.fetch);

jest.mock('~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(),
}));

const mockUsePipelinesAPI = usePipelinesAPI as jest.Mock;

describe('useArtifactStorage', () => {
  const artifact = new Artifact();
  artifact.getUri = jest.fn().mockReturnValue('s3://bucket/test');
  artifact.getId = jest.fn().mockReturnValue(1);
  const mockApi = jest.fn();

  beforeEach(() => {
    mockFetch.mockResolvedValue({
      status: 200,
      text: jest.fn().mockResolvedValue('<html>hello world</html>'),
    } as unknown as Response);
    mockUsePipelinesAPI.mockReturnValue({
      api: { getArtifact: mockApi },
      namespace: 'test-namespace',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return size and url from artifact', async () => {
    mockApi.mockResolvedValue({
      download_url: 'http://rhoai.v1/namespace/45456',
      artifact_size: '60',
    });
    const { result } = testHook(useArtifactStorage)();
    const storageObjectSize = await result.current.getStorageObjectSize(artifact);
    const storageObjectUrl = await result.current.getStorageObjectUrl(artifact);
    expect(storageObjectSize).toBe(60);
    expect(storageObjectUrl).toBe('http://rhoai.v1/namespace/45456');
  });

  it('should handle error while fetching storage object', async () => {
    mockApi.mockRejectedValue('error');
    const { result } = testHook(useArtifactStorage)();
    await expect(result.current.getStorageObjectSize(artifact)).rejects.toThrow(
      'Error fetching Storage size error',
    );
    await expect(result.current.getStorageObjectUrl(artifact)).rejects.toThrow(
      'Error fetching Storage url error',
    );
  });
});
