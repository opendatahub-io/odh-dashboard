import { mockCatalogModel } from '~/__mocks__/mockCatalogModel';
import { mockModelCatalogSource } from '~/__mocks__/mockModelCatalogSource';
import {
  decodeParams,
  encodeParams,
  findModelFromModelCatalogSources,
} from '~/pages/modelCatalog/utils';

describe('findModelFromModelCatalogSources', () => {
  const catalogModelMock = [mockModelCatalogSource({})];
  it('should return catalogModel array', () => {
    const result = findModelFromModelCatalogSources(
      catalogModelMock,
      'Red Hat',
      'rhelai1',
      'granite-8b-code-instruct',
      '1.3-1732870892',
    );
    expect(result).toEqual(mockCatalogModel({}));
  });
  it('should return null, when source is not matched', () => {
    const result = findModelFromModelCatalogSources(
      catalogModelMock,
      'test',
      'rhelai1',
      'granite-8b-code-instruct',
      '1.3-1732870892',
    );
    expect(result).toEqual(null);
  });

  it('should return null, when any other parameter does not match', () => {
    const result = findModelFromModelCatalogSources(
      catalogModelMock,
      'Red Hat',
      'test',
      'granite-8b-code-instruct',
      '1.3-1732870892',
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
