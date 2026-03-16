export enum AssetsFilterOptions {
  NAME = 'name',
  SOURCE = 'source',
  USE_CASE = 'useCase',
  STATUS = 'status',
  MODEL_TYPE = 'modelType',
}

export enum AssetsFilterColors {
  NAME = 'blue',
  SOURCE = 'green',
  USE_CASE = 'purple',
  STATUS = 'orange',
  MODEL_TYPE = 'grey',
}

export const assetsFilterOptions: Record<string, string> = {
  [AssetsFilterOptions.NAME]: 'Name',
  [AssetsFilterOptions.SOURCE]: 'Source',
  [AssetsFilterOptions.USE_CASE]: 'Use Case',
  [AssetsFilterOptions.STATUS]: 'Status',
  [AssetsFilterOptions.MODEL_TYPE]: 'Model Type',
};

export const assetsFilterSelectOptions: Partial<Record<AssetsFilterOptions, string[]>> = {
  [AssetsFilterOptions.SOURCE]: ['MaaS', 'External', 'Public route', 'Internal'],
  [AssetsFilterOptions.STATUS]: ['Active', 'Inactive'],
  [AssetsFilterOptions.MODEL_TYPE]: ['Inferencing', 'Embedding'],
};
