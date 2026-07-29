export enum ModelServingToolbarFilterOptions {
  name = 'Name',
  project = 'Project',
}

export const modelServingFilterOptions = {
  [ModelServingToolbarFilterOptions.name]: 'Name',
  [ModelServingToolbarFilterOptions.project]: 'Project',
};

export type ModelServingFilterDataType = Record<
  ModelServingToolbarFilterOptions,
  string | undefined
>;

export const initialModelServingFilterData: ModelServingFilterDataType = {
  [ModelServingToolbarFilterOptions.name]: '',
  [ModelServingToolbarFilterOptions.project]: '',
};
