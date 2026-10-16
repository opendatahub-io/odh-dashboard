import type { DetailTabExtension } from '@odh-dashboard/plugin-core/extension-points';
import extensions from '~/odh/extensions';

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

  it('uses the catalog namespace for EvalHub security artifact visibility', async () => {
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
      '/eval-hub/api/v1/catalog/sources/source-1/security_artifacts/repo%2Fmodel?pageSize=1&namespace=odh-model-registries',
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('uses the catalog namespace for EvalHub quality artifact visibility', async () => {
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

    expect(fetchMock).toHaveBeenCalledWith(
      '/eval-hub/api/v1/catalog/sources/source-1/quality_artifacts/repo%2Fmodel?pageSize=1&namespace=odh-model-registries',
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('hides artifact visibility without a resolved namespace', async () => {
    const fetchMock = jest.fn();
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchMock });
    const shouldShow = qualityInsightsExtension?.properties.shouldShow;

    await expect(
      shouldShow?.({
        sourceId: 'source-1',
        modelName: 'repo/model',
      }),
    ).resolves.toBe(false);

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
