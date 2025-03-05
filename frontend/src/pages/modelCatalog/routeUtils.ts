import { CatalogModel } from '~/concepts/modelCatalog/types';
import { ModelDetailsRouteParams } from './const';
import { encodeParams, getTagFromModel } from './utils';

export const modelCatalogUrl = (): string => `/modelCatalog`;

export const getModelDetailsUrl = (params: ModelDetailsRouteParams): string => {
  if (!params.sourceName || !params.repositoryName || !params.modelName || !params.tag) {
    return '';
  }
  const { sourceName = '', repositoryName = '', modelName = '', tag = '' } = encodeParams(params);
  return `${modelCatalogUrl()}/${sourceName}/${repositoryName}/${modelName}/${tag}`;
};

export const modelDetailsUrlFromModel = (model: CatalogModel, source: string): string =>
  getModelDetailsUrl({
    sourceName: source,
    repositoryName: model.repository,
    modelName: model.name,
    tag: getTagFromModel(model),
  });

export const registerCatalogModel = (params: ModelDetailsRouteParams): string =>
  `${getModelDetailsUrl(params)}/register`;
