import { CatalogArtifacts, CatalogModel, ModelCatalogSource } from '~/concepts/modelCatalog/types';
import { CatalogModelCustomProps } from './const';

export const findModelFromModelCatalogSources = (
  modelCatalogSources: ModelCatalogSource[],
  source: string | undefined,
  repositoryName: string | undefined,
  modelName: string | undefined,
  tag: string | undefined,
): CatalogModel | null => {
  const modelCatalogSource = modelCatalogSources.find((mcSource) => mcSource.source === source);
  if (!modelCatalogSource) {
    return null;
  }

  const modelMatched = modelCatalogSource.models.find(
    (m: CatalogModel) =>
      m.repository === repositoryName &&
      tag &&
      m.name === modelName &&
      m.artifacts?.some((ca: CatalogArtifacts) => ca.tags?.includes(tag)),
  );

  return modelMatched || null;
};

export const encodeParams = (params: CatalogModelCustomProps): CatalogModelCustomProps =>
  Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      encodeURIComponent(value).replace(/\./g, '%252E'),
    ]),
  );

export const decodeParams = (params: Readonly<CatalogModelCustomProps>): CatalogModelCustomProps =>
  Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, decodeURIComponent(value)]),
  );

export const getTagFromModel = (model: CatalogModel): string | undefined =>
  model.artifacts?.[0]?.tags?.[0];
