export enum ModelRegistryFilterOptions {
  keyword = 'Keyword',
  owner = 'Owner',
}

export const modelRegistryFilterOptions = {
  [ModelRegistryFilterOptions.keyword]: 'Keyword',
  [ModelRegistryFilterOptions.owner]: 'Owner',
};

export type ModelRegistryFilterDataType = Record<ModelRegistryFilterOptions, string | undefined>;

export const initialModelRegistryFilterData: ModelRegistryFilterDataType = {
  [ModelRegistryFilterOptions.keyword]: '',
  [ModelRegistryFilterOptions.owner]: '',
};
