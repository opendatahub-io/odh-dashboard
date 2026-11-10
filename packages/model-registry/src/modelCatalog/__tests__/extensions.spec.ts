import type { DetailTabExtension } from '@odh-dashboard/plugin-core/extension-points';
import { MODEL_CATALOG_API_PATH, QUALITY_ARTIFACT_TYPE, QUALITY_FILTER_QUERY } from '../api';
import extensions from '../../../extensions';

describe('model catalog detail tab extensions', () => {
  const securityInsightsExtension = extensions.find(
    (extension): extension is DetailTabExtension =>
      extension.type === 'core.detail/tab' && extension.properties.id === 'security-insights',
  );
  const qualityInsightsExtension = extensions.find(
    (extension): extension is DetailTabExtension =>
      extension.type === 'core.detail/tab' && extension.properties.id === 'quality-insights',
  );

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the catalog namespace for security artifact visibility', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { items: [{ id: 'artifact-1' }] } }),
    });
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchMock });

    const shouldShow = securityInsightsExtension?.properties.shouldShow;
    expect(shouldShow).toBeDefined();

    await expect(
      shouldShow?.({
        sourceId: 'source-1',
        modelName: 'repo/model',
        namespace: 'odh-model-registries',
      }),
    ).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(
      `${MODEL_CATALOG_API_PATH}/source-1/security_artifacts/repo%2Fmodel?pageSize=1&namespace=odh-model-registries`,
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('uses the catalog namespace and evaluation-metrics filters for quality artifact visibility', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { items: [{ id: 'artifact-1' }] } }),
    });
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchMock });

    const shouldShow = qualityInsightsExtension?.properties.shouldShow;
    expect(shouldShow).toBeDefined();

    await expect(
      shouldShow?.({
        sourceId: 'source-1',
        modelName: 'repo/model',
        namespace: 'odh-model-registries',
      }),
    ).resolves.toBe(true);

    const params = new URLSearchParams({
      pageSize: '1',
      artifactType: QUALITY_ARTIFACT_TYPE,
      filterQuery: QUALITY_FILTER_QUERY,
      namespace: 'odh-model-registries',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `${MODEL_CATALOG_API_PATH}/source-1/artifacts/repo%2Fmodel?${params.toString()}`,
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('keeps artifact visibility pending while the namespace is unresolved', async () => {
    const fetchMock = jest.fn();
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchMock });
    const shouldShow = qualityInsightsExtension?.properties.shouldShow;

    // The predicate must stay pending (not resolve false) so ExtensibleDetailTabs
    // retains an active deep-linked tab instead of redirecting it away before the
    // namespace resolves and the predicate re-runs.
    const result = shouldShow?.({ sourceId: 'source-1', modelName: 'repo/model' });
    expect(result).toBeInstanceOf(Promise);

    let settled = false;
    void (result as Promise<boolean>).then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });

    expect(settled).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([403, 404])('treats a %s response as no visible artifacts', async (status) => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status });
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchMock });
    const shouldShow = qualityInsightsExtension?.properties.shouldShow;

    await expect(
      shouldShow?.({
        sourceId: 'source-1',
        modelName: 'repo/model',
        namespace: 'odh-model-registries',
      }),
    ).resolves.toBe(false);
  });

  it('preserves other HTTP and network errors', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockRejectedValueOnce(new Error('network failure'));
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchMock });
    const shouldShow = qualityInsightsExtension?.properties.shouldShow;
    const props = {
      sourceId: 'source-1',
      modelName: 'repo/model',
      namespace: 'odh-model-registries',
    };

    await expect(shouldShow?.(props)).rejects.toThrow(
      'Catalog artifact visibility request failed with status 500.',
    );
    await expect(shouldShow?.(props)).rejects.toThrow('network failure');
  });
});
