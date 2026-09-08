/* eslint-disable camelcase */
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { mockCatalogModel } from '~/__mocks__/mockCatalogModelList';
import { mockCatalogModelArtifact } from '~/__mocks__/mockCatalogModelArtifactList';
import type { CatalogArtifactList } from '~/app/modelCatalogTypes';
import useModelRegistryDashboardConfig from '~/app/hooks/useModelRegistryDashboardConfig';
import useCatalogDeployPrefillData from '~/odh/hooks/useCatalogDeployPrefillData';

jest.mock('~/app/hooks/useModelRegistryDashboardConfig', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseModelRegistryDashboardConfig = jest.mocked(useModelRegistryDashboardConfig);

const emptyArtifacts: CatalogArtifactList = {
  items: [],
  size: 0,
  pageSize: 0,
  nextPageToken: '',
};

const artifactsWithUri: CatalogArtifactList = {
  items: [mockCatalogModelArtifact({ uri: 's3://bucket/model' })],
  size: 1,
  pageSize: 1,
  nextPageToken: '',
};

describe('useCatalogDeployPrefillData', () => {
  beforeEach(() => {
    mockUseModelRegistryDashboardConfig.mockReturnValue({ toolCalling: false });
  });

  it('should return minimal prefill when model is not loaded', () => {
    const renderResult = testHook(useCatalogDeployPrefillData)(
      null,
      artifactsWithUri,
      true,
      undefined,
      'huggingface',
      'my-model',
    );

    expect(renderResult).hookToHaveUpdateCount(1);
    expect(renderResult.result.current.deployPrefill).toEqual({
      modelName: '',
      modelUri: 's3://bucket/model',
    });
    expect(renderResult.result.current.deployPrefillLoaded).toBe(false);
    expect(renderResult.result.current.deployPrefillError).toBeUndefined();
  });

  it('should build catalog deploy prefill with catalogModelId from sourceId', () => {
    const model = mockCatalogModel({ name: 'repo/model', source_id: 'sample-source' });

    const renderResult = testHook(useCatalogDeployPrefillData)(
      model,
      artifactsWithUri,
      true,
      undefined,
      'huggingface',
      'repo/model',
    );

    expect(renderResult).hookToHaveUpdateCount(1);
    expect(renderResult.result.current.deployPrefill).toMatchObject({
      modelName: 'repo/model',
      modelUri: 's3://bucket/model',
      catalogModelId: 'huggingface/repo/model',
      returnRouteValue: '/ai-hub/models/deployments/',
      wizardStartIndex: 1,
      prefillAlertText: 'The repo/model model details have been imported from the model catalog.',
    });
    expect(renderResult.result.current.deployPrefill.cancelReturnRouteValue).toContain(
      'repo%2Fmodel',
    );
    expect(renderResult.result.current.deployPrefillLoaded).toBe(true);
  });

  it('should fall back to model.source_id when sourceId is empty', () => {
    const model = mockCatalogModel({ name: 'repo/model', source_id: 'model-source' });

    const renderResult = testHook(useCatalogDeployPrefillData)(
      model,
      artifactsWithUri,
      true,
      undefined,
      '',
      'repo/model',
    );

    expect(renderResult.result.current.deployPrefill.catalogModelId).toBe(
      'model-source/repo/model',
    );
  });

  it('should not mark prefill as loaded when artifacts are still loading', () => {
    const model = mockCatalogModel();

    const renderResult = testHook(useCatalogDeployPrefillData)(
      model,
      artifactsWithUri,
      false,
      undefined,
      'huggingface',
      model.name,
    );

    expect(renderResult.result.current.deployPrefillLoaded).toBe(false);
  });

  it('should not mark prefill as loaded when artifact URI is missing', () => {
    const model = mockCatalogModel();

    const renderResult = testHook(useCatalogDeployPrefillData)(
      model,
      emptyArtifacts,
      true,
      undefined,
      'huggingface',
      model.name,
    );

    expect(renderResult.result.current.deployPrefill.modelUri).toBe('');
    expect(renderResult.result.current.deployPrefillLoaded).toBe(false);
  });

  it('should surface artifact load errors', () => {
    const model = mockCatalogModel();
    const error = new Error('Failed to load artifacts');

    const renderResult = testHook(useCatalogDeployPrefillData)(
      model,
      artifactsWithUri,
      true,
      error,
      'huggingface',
      model.name,
    );

    expect(renderResult.result.current.deployPrefillError).toBe(error);
    expect(renderResult.result.current.deployPrefillLoaded).toBe(false);
  });

  it('should keep memoized values stable when inputs are unchanged', () => {
    const model = mockCatalogModel({ name: 'repo/model', source_id: 'sample-source' });

    const renderResult = testHook(useCatalogDeployPrefillData)(
      model,
      artifactsWithUri,
      true,
      undefined,
      'huggingface',
      'repo/model',
    );

    expect(renderResult).hookToHaveUpdateCount(1);

    renderResult.rerender(model, artifactsWithUri, true, undefined, 'huggingface', 'repo/model');

    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable({
      deployPrefill: true,
      deployPrefillLoaded: true,
      deployPrefillError: true,
    });
  });

  it('should rebuild deployPrefill when sourceId changes', () => {
    const model = mockCatalogModel({ name: 'repo/model', source_id: 'sample-source' });

    const renderResult = testHook(useCatalogDeployPrefillData)(
      model,
      artifactsWithUri,
      true,
      undefined,
      'huggingface',
      'repo/model',
    );

    const previousPrefill = renderResult.result.current.deployPrefill;

    renderResult.rerender(model, artifactsWithUri, true, undefined, 'openvino', 'repo/model');

    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable({
      deployPrefill: false,
      deployPrefillLoaded: true,
      deployPrefillError: true,
    });
    expect(renderResult.result.current.deployPrefill).not.toBe(previousPrefill);
    expect(renderResult.result.current.deployPrefill.catalogModelId).toBe('openvino/repo/model');
  });
});
