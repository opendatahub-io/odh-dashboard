export enum ExternalModelsFilterOptions {
  keyword = 'keyword',
}

export const externalModelsFilterOptions = {
  [ExternalModelsFilterOptions.keyword]: 'Keyword',
};

export type ExternalModelsFilterDataType = Record<ExternalModelsFilterOptions, string | undefined>;

export const initialExternalModelsFilterData: ExternalModelsFilterDataType = {
  [ExternalModelsFilterOptions.keyword]: '',
};
