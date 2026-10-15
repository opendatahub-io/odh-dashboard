import type { DetailTabExtension } from '@odh-dashboard/plugin-core/extension-points';
import extensions from '~/odh/extensions';

describe('model catalog detail tab extensions', () => {
  const qualityInsightsExtension = extensions.find(
    (extension): extension is DetailTabExtension =>
      extension.type === 'core.detail/tab' && extension.properties.id === 'quality-insights',
  );

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the preferred project namespace for EvalHub artifact visibility', async () => {
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
        catalogNamespace: 'odh-model-registries',
        evalHubNamespace: 'project-only',
      }),
    ).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(
      '/eval-hub/api/v1/catalog/sources/source-1/quality_artifacts/repo%2Fmodel?pageSize=1&namespace=project-only',
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('does not query artifact visibility without an EvalHub project namespace', async () => {
    const fetchMock = jest.fn();
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchMock });
    const shouldShow = qualityInsightsExtension?.properties.shouldShow;

    await expect(
      shouldShow?.({
        sourceId: 'source-1',
        modelName: 'repo/model',
        catalogNamespace: 'odh-model-registries',
      }),
    ).resolves.toBe(false);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
