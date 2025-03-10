import { CatalogModel } from '~/concepts/modelCatalog/types';

import { CatalogModelDetailsParams } from '~/pages/modelCatalog/types';
import { encodeParams, getTagFromModel } from './utils';

export const modelCatalogUrl = `/modelCatalog`;

export const getCatalogModelDetailsUrl = (params: CatalogModelDetailsParams): string => {
  if (!params.sourceName || !params.repositoryName || !params.modelName || !params.tag) {
    return '';
  }
  const { sourceName = '', repositoryName = '', modelName = '', tag = '' } = encodeParams(params);
  return `${modelCatalogUrl}/${sourceName}/${repositoryName}/${modelName}/${tag}`;
};

export const getCatalogModelDetailsUrlFromModel = (model: CatalogModel, source: string): string =>
  getCatalogModelDetailsUrl({
    sourceName: source,
    repositoryName: model.repository,
    modelName: model.name,
    tag: getTagFromModel(model),
  });

export const getRegisterCatalogModelUrl = (params: CatalogModelDetailsParams): string =>
  `${getCatalogModelDetailsUrl(params)}/register`;
