import { CatalogArtifacts, CatalogModel, ModelCatalogSource } from '~/concepts/modelCatalog/types';
import {
  EMPTY_CUSTOM_PROPERTY_STRING,
  RESERVED_ILAB_LABELS,
  ReservedILabLabel,
} from '~/pages/modelCatalog/const';
import { ModelRegistryCustomProperties } from '~/concepts/modelRegistry/types';
import { CatalogModelDetailsParams } from '~/pages/modelCatalog/types';

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

export const encodeParams = (params: CatalogModelDetailsParams): CatalogModelDetailsParams =>
  Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      encodeURIComponent(value).replace(/\./g, '%252E'),
    ]),
  );

export const decodeParams = (
  params: Readonly<CatalogModelDetailsParams>,
): CatalogModelDetailsParams =>
  Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, decodeURIComponent(value)]),
  );

export const getTagFromModel = (model: CatalogModel): string | undefined =>
  model.artifacts?.[0]?.tags?.[0];

export const getILabLabels = (labels?: string[]): string[] =>
  labels?.filter((l) => RESERVED_ILAB_LABELS.some((ril) => ril === l)) ?? [];

export const removeILabLabels = (labels?: string[]): string[] =>
  labels?.filter((l) => !RESERVED_ILAB_LABELS.some((ril) => ril === l)) ?? [];

export const isLabBase = (labels?: string[]): boolean =>
  !!labels?.includes(ReservedILabLabel.LabBase);

export const createCustomPropertiesFromModel = (
  model: CatalogModel,
): ModelRegistryCustomProperties => {
  const labels = removeILabLabels(model.labels).reduce<ModelRegistryCustomProperties>(
    (acc, cur) => {
      acc[cur] = EMPTY_CUSTOM_PROPERTY_STRING;
      return acc;
    },
    {},
  );

  const tasks = model.tasks?.reduce<ModelRegistryCustomProperties>((acc, cur) => {
    acc[cur] = EMPTY_CUSTOM_PROPERTY_STRING;
    return acc;
  }, {});

  return { ...labels, ...tasks };
};
