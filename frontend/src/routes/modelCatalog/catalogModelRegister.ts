import { CatalogModelDetailsParams } from '#~/pages/modelCatalog/types';
import { encodeParams } from '#~/pages/modelCatalog/utils';

export const getRegisterCatalogModelRoute = (params: CatalogModelDetailsParams): string => {
  if (!params.sourceName || !params.repositoryName || !params.modelName || !params.tag) {
    return '';
  }
  const { sourceName = '', repositoryName = '', modelName = '', tag = '' } = encodeParams(params);
  return `/modelCatalog/${sourceName}/${repositoryName}/${modelName}/${tag}/register`;
};
