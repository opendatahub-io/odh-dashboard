/* eslint-disable camelcase */
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { fetchStorageObject, fetchStorageObjectSize } from '~/services/storageService';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { Artifact } from '~/third_party/mlmd';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { useArtifactStorage } from '~/concepts/pipelines/apiHooks/useArtifactStorage';

global.fetch = jest.fn();
const mockFetch = jest.mocked(global.fetch);
jest.mock('~/concepts/areas', () => ({
  ...jest.requireActual('~/concepts/areas'),
  useIsAreaAvailable: jest.fn(),
}));

jest.mock('~/services/storageService', () => ({
  fetchStorageObject: jest.fn(),
  fetchStorageObjectSize: jest.fn(),
}));

jest.mock('~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(),
}));

const mockFetchStorageObject = fetchStorageObject as jest.Mock;
const mockFetchStorageObjectSize = fetchStorageObjectSize as jest.Mock;
const mockUsePipelinesAPI = usePipelinesAPI as jest.Mock;
const mockUseIsAreaAvailable = useIsAreaAvailable as jest.Mock;

describe('useArtifactStorage', () => {
  const artifact = new Artifact();
  artifact.getUri = jest.fn().mockReturnValue('s3://bucket/test');
  artifact.getId = jest.fn().mockReturnValue(1);
  const mockApi = jest.fn();

  beforeEach(() => {
    mockFetchStorageObject.mockResolvedValue('<html>hello world</html>');
    mockFetch.mockResolvedValue({
      status: 200,
      text: jest.fn().mockResolvedValue('<html>hello world</html>'),
    } as unknown as Response);
    mockFetchStorageObjectSize.mockResolvedValue(60);
    mockUsePipelinesAPI.mockReturnValue({
      api: { getArtifact: mockApi },
      namespace: 'test-namespace',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  const setAreaAvailable = (s3EndpointStatus: boolean, artifactApiStatus: boolean) => {
    mockUseIsAreaAvailable.mockImplementation((area) => {
      if (area === SupportedArea.S3_ENDPOINT) {
        return { status: s3EndpointStatus };
      }
      if (area === SupportedArea.ARTIFACT_API) {
        return { status: artifactApiStatus };
      }
      return { status: false };
    });
  };

  it('should return backend storage when  artifactApi is not available and s3Endpoint is available', async () => {
    setAreaAvailable(true, false);
    const { result } = testHook(useArtifactStorage)();
    expect(result.current.enabled).toBe(true);
    if (result.current.enabled) {
      const storageObject = await result.current.getStorageObject(artifact);
      const storageObjectSize = await result.current.getStorageObjectSize(artifact);
      const storageObjectUrl = await result.current.getStorageObjectUrl(artifact);

      expect(storageObject).toBe('<html>hello world</html>');
      expect(storageObjectSize).toBe(60);
      expect(storageObjectUrl).toBe('/api/storage/test-namespace?key=test');
    }
  });

  it('should return dsp server api when artifactApi is available', async () => {
    setAreaAvailable(true, true);
    mockApi.mockResolvedValue({
      download_url: 'http://rhoai.v1/namespace/45456',
      artifact_size: '60',
    });
    const { result } = testHook(useArtifactStorage)();
    expect(result.current.enabled).toBe(true);
    if (result.current.enabled) {
      const storageObject = await result.current.getStorageObject(artifact);
      const storageObjectSize = await result.current.getStorageObjectSize(artifact);
      const storageObjectUrl = await result.current.getStorageObjectUrl(artifact);
      expect(storageObject).toBe('<html>hello world</html>');
      expect(storageObjectSize).toBe(60);
      expect(storageObjectUrl).toBe('http://rhoai.v1/namespace/45456');
    }
  });

  it('should return undefined when artifact api and  s3Endpoint are absent', async () => {
    setAreaAvailable(false, false);
    const renderResult = testHook(useArtifactStorage)();
    expect(renderResult.result.current.enabled).toBe(false);
  });

  it('should handle error while fetching storage object using dsp server api', async () => {
    mockApi.mockRejectedValue('error');
    setAreaAvailable(true, true);
    const { result } = testHook(useArtifactStorage)();
    expect(result.current.enabled).toBe(true);
    if (result.current.enabled) {
      await expect(result.current.getStorageObject(artifact)).rejects.toThrow(
        'Error fetching Storage object error',
      );
      await expect(result.current.getStorageObjectSize(artifact)).rejects.toThrow(
        'Error fetching Storage size error',
      );
      await expect(result.current.getStorageObjectUrl(artifact)).rejects.toThrow(
        'Error fetching Storage url error',
      );
    }
  });

  it('should reject when uriComponent is not present but s3Endpoint is available', async () => {
    artifact.getUri = jest.fn().mockReturnValue('bucket/test/');
    setAreaAvailable(true, false);
    const { result } = testHook(useArtifactStorage)();
    expect(result.current.enabled).toBe(true);
    if (result.current.enabled) {
      await expect(result.current.getStorageObject(artifact)).rejects.toBeUndefined();
      await expect(result.current.getStorageObjectSize(artifact)).rejects.toBeUndefined();
    }
  });
});
