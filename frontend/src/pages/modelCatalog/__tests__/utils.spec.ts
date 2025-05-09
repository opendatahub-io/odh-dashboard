import { mockCatalogModel } from '~/__mocks__/mockCatalogModel';
import { mockModelCatalogSource } from '~/__mocks__/mockModelCatalogSource';
import {
  createCustomPropertiesFromModel,
  decodeParams,
  encodeParams,
  findModelFromModelCatalogSources,
  getILabLabels,
  getTagFromModel,
  isLabBase,
  removeILabLabels,
  getDeployButtonState,
} from '~/pages/modelCatalog/utils';
import { EMPTY_CUSTOM_PROPERTY_STRING } from '~/pages/modelCatalog/const';
import { DEPLOY_BUTTON_TOOLTIP } from '~/pages/modelServing/screens/const';

describe('findModelFromModelCatalogSources', () => {
  const catalogModelMock = [mockModelCatalogSource({})];
  it('should return catalogModel array', () => {
    const result = findModelFromModelCatalogSources(
      catalogModelMock,
      'Red Hat',
      'rhelai1',
      'granite-8b-code-instruct',
      '1.3.0',
    );
    expect(result).toEqual(mockCatalogModel({}));
  });
  it('should return null, when source is not matched', () => {
    const result = findModelFromModelCatalogSources(
      catalogModelMock,
      'test',
      'rhelai1',
      'granite-8b-code-instruct',
      '1.3.0',
    );
    expect(result).toEqual(null);
  });

  it('should return null, when any other parameter does not match', () => {
    const result = findModelFromModelCatalogSources(
      catalogModelMock,
      'Red Hat',
      'test',
      'granite-8b-code-instruct',
      '1.3.0',
    );
    expect(result).toEqual(null);
  });
});

describe('encodeParams', () => {
  it('should return enocoded params', () => {
    const result = encodeParams({
      sourceName: 'sample test',
      tag: '1.33-44',
      repositoryName: 'test@12',
      modelName: 'test',
    });
    expect(result).toEqual({
      sourceName: 'sample%20test',
      tag: '1%252E33-44',
      repositoryName: 'test%4012',
      modelName: 'test',
    });
  });
});

describe('decodeParams', () => {
  it('should return decoded params', () => {
    const result = decodeParams({
      sourceName: 'sample%20test',
      repositoryName: 'test%4012',
      tag: '1%2E33-44',
      modelName: 'test',
    });
    expect(result).toEqual({
      sourceName: 'sample test',
      tag: '1.33-44',
      repositoryName: 'test@12',
      modelName: 'test',
    });
  });
});

describe('getTagFromModel', () => {
  it('should return tag from model version', () => {
    const result = getTagFromModel({
      ...mockCatalogModel({}),
    });
    expect(result).toBe('1.3.0');
  });

  it('should return undefined if version is not present', () => {
    const result = getTagFromModel({
      ...mockCatalogModel({}),
      artifacts: [{ tags: [] }],
    });
    expect(result).toBe(undefined);
  });
});

describe('getILabLabels', () => {
  it('should return any matching ILab labels', () => {
    const expected = ['lab-base', 'lab-judge'];

    const result = getILabLabels(['lab-base', 'lab-judge', 'value-1', 'value-2', 'lab-zzzzxxxxx']);
    expect(result).toEqual(expected);
  });

  it('should return an empty list when no ILab labels are present', () => {
    const result = getILabLabels(['foo', 'bar', 'baz']);

    expect(result).toEqual([]);
  });

  it('should return an empty list if given an empty list', () => {
    const result = getILabLabels([]);
    expect(result).toEqual([]);
  });

  it('should return an empty list if given undefined', () => {
    const result = getILabLabels(undefined);
    expect(result).toEqual([]);
  });
});

describe('removeILabLabels', () => {
  it('should return all non ILab labels', () => {
    const expected = ['foo', 'bar', 'baz'];
    const result = removeILabLabels(['foo', 'bar', 'baz', 'lab-base', 'lab-teacher', 'lab-judge']);

    expect(result).toEqual(expected);
  });

  it('should return labels when no ILab labels are present', () => {
    const expected = ['foo', 'bar', 'baz'];
    const result = removeILabLabels(['foo', 'bar', 'baz']);

    expect(result).toEqual(expected);
  });

  it('should return an empty list when only ilab labels are given', () => {
    const result = removeILabLabels(['lab-base', 'lab-teacher', 'lab-judge']);

    expect(result).toEqual([]);
  });

  it('should return an empty list if given undefined', () => {
    const result = removeILabLabels(undefined);
    expect(result).toEqual([]);
  });
});

describe('isLabBase', () => {
  it('should return true if lab-base is present', () => {
    const result = isLabBase(['foo', 'lab-base', 'bar', 'baz']);
    expect(result).toEqual(true);
  });
  it('should return false if lab-base is not present', () => {
    const result = isLabBase(['foo', 'bar', 'baz']);
    expect(result).toEqual(false);
  });
});

describe('createCustomPropertiesFromModel', () => {
  it('should return ModelRegistryCustomProperties with ilab labels removed', () => {
    const expected = {
      foo: EMPTY_CUSTOM_PROPERTY_STRING,
      bar: EMPTY_CUSTOM_PROPERTY_STRING,
      value1: EMPTY_CUSTOM_PROPERTY_STRING,
      value2: EMPTY_CUSTOM_PROPERTY_STRING,
    };

    const result = createCustomPropertiesFromModel(
      mockCatalogModel({
        tasks: ['foo', 'bar'],
        labels: ['lab-base', 'lab-teacher', 'lab-judge', 'value1', 'value2'],
      }),
    );

    expect(result).toEqual(expected);
  });

  it('should return an empty object when properties are missing', () => {
    const result = createCustomPropertiesFromModel(
      mockCatalogModel({
        tasks: undefined,
        labels: undefined,
      }),
    );

    expect(result).toEqual({});
  });
});

describe('getDeployButtonState', () => {
  it('returns not visible if model serving is disabled', () => {
    expect(
      getDeployButtonState({
        isModelServingEnabled: false,
        platformEnabledCount: 1,
        isKServeEnabled: true,
        isOciModel: false,
      }),
    ).toEqual({ visible: false });
  });

  it('returns disabled with tooltip if no platforms are enabled', () => {
    expect(
      getDeployButtonState({
        isModelServingEnabled: true,
        platformEnabledCount: 0,
        isKServeEnabled: false,
        isOciModel: false,
      }),
    ).toEqual({
      visible: true,
      enabled: false,
      tooltip: DEPLOY_BUTTON_TOOLTIP.ENABLE_MODEL_SERVING_PLATFORM,
    });
  });

  it('returns disabled with tooltip if OCI model and kserve is not enabled', () => {
    expect(
      getDeployButtonState({
        isModelServingEnabled: true,
        platformEnabledCount: 1,
        isKServeEnabled: false,
        isOciModel: true,
      }),
    ).toEqual({
      visible: true,
      enabled: false,
      tooltip: DEPLOY_BUTTON_TOOLTIP.ENABLE_SINGLE_MODEL_SERVING,
    });
  });

  it('returns enabled if all requirements are met', () => {
    expect(
      getDeployButtonState({
        isModelServingEnabled: true,
        platformEnabledCount: 1,
        isKServeEnabled: true,
        isOciModel: false,
      }),
    ).toEqual({
      visible: true,
      enabled: true,
    });
  });
});
