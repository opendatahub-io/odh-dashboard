import {
  encodeParams,
  getTagFromModel,
  getILabLabels,
  removeILabLabels,
  getDeployButtonState,
} from '#~/concepts/modelCatalog/utils';
import { CatalogModel } from '#~/concepts/modelCatalog/types';
import { DEPLOY_BUTTON_TOOLTIP } from '#~/pages/modelServing/screens/const';

describe('encodeParams', () => {
  it('encodes parameter values', () => {
    const result = encodeParams({
      sourceName: 'my source',
      repositoryName: 'repo/name',
      modelName: 'model.name',
      tag: 'v1',
    });
    expect(result).toEqual({
      sourceName: 'my%20source',
      repositoryName: 'repo%2Fname',
      modelName: 'model%252Ename',
      tag: 'v1',
    });
  });

  it('replaces dots with double-encoded %252E', () => {
    const result = encodeParams({
      sourceName: 'a.b.c',
      repositoryName: 'x',
      modelName: 'y',
      tag: 'z',
    });
    expect(result.sourceName).toBe('a%252Eb%252Ec');
  });
});

describe('getTagFromModel', () => {
  it('returns the first tag of the first artifact', () => {
    const model = {
      artifacts: [{ tags: ['v1.0', 'latest'] }],
    } as unknown as CatalogModel;
    expect(getTagFromModel(model)).toBe('v1.0');
  });

  it('returns undefined when no artifacts', () => {
    const model = {} as unknown as CatalogModel;
    expect(getTagFromModel(model)).toBeUndefined();
  });

  it('returns undefined when artifacts have no tags', () => {
    const model = { artifacts: [{}] } as unknown as CatalogModel;
    expect(getTagFromModel(model)).toBeUndefined();
  });
});

describe('getILabLabels', () => {
  it('returns only reserved iLab labels', () => {
    const labels = ['lab-base', 'custom-label', 'lab-judge'];
    expect(getILabLabels(labels)).toEqual(['lab-base', 'lab-judge']);
  });

  it('returns empty array when no labels match', () => {
    expect(getILabLabels(['custom'])).toEqual([]);
  });

  it('returns empty array for undefined input', () => {
    expect(getILabLabels(undefined)).toEqual([]);
  });
});

describe('removeILabLabels', () => {
  it('removes reserved iLab labels', () => {
    const labels = ['lab-base', 'custom-label', 'lab-judge'];
    expect(removeILabLabels(labels)).toEqual(['custom-label']);
  });

  it('returns all labels when none are reserved', () => {
    expect(removeILabLabels(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('returns empty array for undefined input', () => {
    expect(removeILabLabels(undefined)).toEqual([]);
  });
});

describe('getDeployButtonState', () => {
  it('returns not visible when model serving is disabled', () => {
    const result = getDeployButtonState({
      isModelServingEnabled: false,
      platformEnabledCount: 1,
      isKServeEnabled: true,
      isOciModel: false,
    });
    expect(result).toEqual({ visible: false });
  });

  it('returns disabled when no platforms are enabled', () => {
    const result = getDeployButtonState({
      isModelServingEnabled: true,
      platformEnabledCount: 0,
      isKServeEnabled: false,
      isOciModel: false,
    });
    expect(result).toEqual({
      visible: true,
      enabled: false,
      tooltip: DEPLOY_BUTTON_TOOLTIP.ENABLE_MODEL_SERVING_PLATFORM,
    });
  });

  it('returns disabled for OCI model when KServe is not enabled', () => {
    const result = getDeployButtonState({
      isModelServingEnabled: true,
      platformEnabledCount: 1,
      isKServeEnabled: false,
      isOciModel: true,
    });
    expect(result).toEqual({
      visible: true,
      enabled: false,
      tooltip: DEPLOY_BUTTON_TOOLTIP.ENABLE_SINGLE_MODEL_SERVING,
    });
  });

  it('returns enabled when all conditions are met', () => {
    const result = getDeployButtonState({
      isModelServingEnabled: true,
      platformEnabledCount: 1,
      isKServeEnabled: true,
      isOciModel: false,
    });
    expect(result).toEqual({ visible: true, enabled: true });
  });

  it('returns enabled for OCI model when KServe is enabled', () => {
    const result = getDeployButtonState({
      isModelServingEnabled: true,
      platformEnabledCount: 1,
      isKServeEnabled: true,
      isOciModel: true,
    });
    expect(result).toEqual({ visible: true, enabled: true });
  });
});
