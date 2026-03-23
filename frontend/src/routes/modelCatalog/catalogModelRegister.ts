import { CatalogModelDetailsParams } from '#~/concepts/modelCatalog/types';
import { encodeParams } from '#~/concepts/modelCatalog/utils';

export const getRegisterCatalogModelRoute = (params: CatalogModelDetailsParams): string => {
  if (!params.sourceName || !params.repositoryName || !params.modelName || !params.tag) {
    return '';
  }
  const { sourceName = '', repositoryName = '', modelName = '', tag = '' } = encodeParams(params);
  return `/ai-hub/catalog/${sourceName}/${repositoryName}/${modelName}/${tag}/register`;
};
