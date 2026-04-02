import { CatalogModel, CatalogModelDetailsParams } from '#~/concepts/modelCatalog/types';
import { encodeParams, getTagFromModel } from '#~/concepts/modelCatalog/utils';

export const modelCatalogRoute = `/ai-hub/models/catalog`;

export const getCatalogModelDetailsRoute = (params: CatalogModelDetailsParams): string => {
  if (!params.sourceName || !params.repositoryName || !params.modelName || !params.tag) {
    return '';
  }
  const { sourceName = '', repositoryName = '', modelName = '', tag = '' } = encodeParams(params);
  return `${modelCatalogRoute}/${sourceName}/${repositoryName}/${modelName}/${tag}`;
};

export const getCatalogModelDetailsRouteFromModel = (model: CatalogModel, source: string): string =>
  getCatalogModelDetailsRoute({
    sourceName: source,
    repositoryName: model.repository,
    modelName: model.name,
    tag: getTagFromModel(model),
  });
