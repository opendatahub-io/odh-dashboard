export enum OverviewFilterOptions {
  modelName = 'modelName',
  project = 'project',
  groupName = 'groupName',
  subscriptionName = 'subscriptionName',
  authPolicyName = 'authPolicyName',
}

export const overviewFilterOptions = {
  [OverviewFilterOptions.modelName]: 'Model',
  [OverviewFilterOptions.project]: 'Project',
  [OverviewFilterOptions.groupName]: 'Group',
  [OverviewFilterOptions.subscriptionName]: 'Subscription',
  [OverviewFilterOptions.authPolicyName]: 'Authorization policy',
};

export type OverviewFilterDataType = Record<
  OverviewFilterOptions,
  string | { label: string; value: string } | undefined
>;

export const initialOverviewFilterData: OverviewFilterDataType = {
  [OverviewFilterOptions.modelName]: '',
  [OverviewFilterOptions.project]: '',
  [OverviewFilterOptions.groupName]: '',
  [OverviewFilterOptions.subscriptionName]: '',
  [OverviewFilterOptions.authPolicyName]: '',
};
