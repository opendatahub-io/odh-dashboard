import { ModelDetailsRouteParams } from './const';
import { encodeParams } from './utils';

export const modelCatalogUrl = (): string => `/modelCatalog`;

export const modelDetailsUrl = (params: ModelDetailsRouteParams): string => {
  const { sourceName = '', repositoryName = '', modelName = '', tag = '' } = encodeParams(params);
  return `${modelCatalogUrl()}/${sourceName}/${repositoryName}/${modelName}/${tag}`;
};
