import {
  MODEL_CATALOG_API_PATH,
  QUALITY_ARTIFACT_TYPE,
  QUALITY_FILTER_QUERY,
  getCatalogQualityArtifacts,
  getCatalogSecurityArtifacts,
} from '../api';

const fetchMock = jest.fn();

describe('catalog artifacts api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchMock });
  });

  describe('getCatalogSecurityArtifacts', () => {
    it('should request the security artifacts route with namespace and page size', async () => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: { items: [] } }) });

      await getCatalogSecurityArtifacts('source-1', 'repo/model', 'ns-1', 100);

      expect(fetchMock).toHaveBeenCalledWith(
        `${MODEL_CATALOG_API_PATH}/source-1/security_artifacts/repo%2Fmodel?namespace=ns-1&pageSize=100`,
        expect.objectContaining({ headers: { Accept: 'application/json' } }),
      );
    });

    it('should omit the page size when not provided', async () => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: { items: [] } }) });

      await getCatalogSecurityArtifacts('source-1', 'repo/model', 'ns-1');

      expect(fetchMock).toHaveBeenCalledWith(
        `${MODEL_CATALOG_API_PATH}/source-1/security_artifacts/repo%2Fmodel?namespace=ns-1`,
        expect.anything(),
      );
    });
  });

  describe('getCatalogQualityArtifacts', () => {
    it('should request the artifacts catch-all with the evaluation-metrics filters', async () => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: { items: [] } }) });

      await getCatalogQualityArtifacts('source-1', 'repo/model', 'ns-1', 100, 'token-2');

      const params = new URLSearchParams({
        namespace: 'ns-1',
        artifactType: QUALITY_ARTIFACT_TYPE,
        filterQuery: QUALITY_FILTER_QUERY,
        pageSize: '100',
        nextPageToken: 'token-2',
      });
      expect(fetchMock).toHaveBeenCalledWith(
        `${MODEL_CATALOG_API_PATH}/source-1/artifacts/repo%2Fmodel?${params.toString()}`,
        expect.anything(),
      );
    });

    it('should omit optional paging parameters when not provided', async () => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: { items: [] } }) });

      await getCatalogQualityArtifacts('source-1', 'repo/model', 'ns-1');

      const params = new URLSearchParams({
        namespace: 'ns-1',
        artifactType: QUALITY_ARTIFACT_TYPE,
        filterQuery: QUALITY_FILTER_QUERY,
      });
      expect(fetchMock).toHaveBeenCalledWith(
        `${MODEL_CATALOG_API_PATH}/source-1/artifacts/repo%2Fmodel?${params.toString()}`,
        expect.anything(),
      );
    });
  });

  describe('response handling', () => {
    it('should unwrap the data envelope', async () => {
      const items = [{ id: 'artifact-1' }];
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: { items } }) });

      await expect(getCatalogSecurityArtifacts('source-1', 'model', 'ns-1')).resolves.toEqual({
        items,
      });
    });

    it('should forward the abort signal', async () => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: { items: [] } }) });
      const controller = new AbortController();

      await getCatalogSecurityArtifacts('source-1', 'model', 'ns-1', undefined, {
        signal: controller.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith(expect.any(String), {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
    });

    it('should throw on a non-OK response', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500 });

      await expect(getCatalogSecurityArtifacts('source-1', 'model', 'ns-1')).rejects.toThrow(
        'Catalog artifacts request failed with status 500.',
      );
    });

    it('should throw when the response has no data envelope', async () => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ invalid: 'format' }) });

      await expect(getCatalogQualityArtifacts('source-1', 'model', 'ns-1')).rejects.toThrow(
        'Invalid response format',
      );
    });
  });
});
