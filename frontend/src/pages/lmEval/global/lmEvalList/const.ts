export enum LMEvalToolbarFilterOptions {
  name = 'Name',
  project = 'Project',
}

export const LMEvalFilterOptions = {
  [LMEvalToolbarFilterOptions.name]: 'Name',
  [LMEvalToolbarFilterOptions.project]: 'Project',
};

export type LMEvalFilterDataType = Record<LMEvalToolbarFilterOptions, string | undefined>;

export const initialLMEvalFilterData: LMEvalFilterDataType = {
  [LMEvalToolbarFilterOptions.name]: '',
  [LMEvalToolbarFilterOptions.project]: '',
};
