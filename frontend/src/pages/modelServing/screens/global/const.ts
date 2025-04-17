export enum Options {
  name = 'Name',
  project = 'Project',
}

export const options = {
  [Options.name]: 'Name',
  [Options.project]: 'Project',
};

export type DashboardFilterDataType = Record<Options, string | undefined>;

export const initialDashboardFilterData: DashboardFilterDataType = {
  [Options.name]: '',
  [Options.project]: '',
};