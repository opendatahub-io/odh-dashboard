export enum OverviewFilterOptions {
  modelName = 'modelName',
  project = 'project',
  groupName = 'groupName',
  subscriptionName = 'subscriptionName',
  authPolicyName = 'authPolicyName',
}

export const overviewFilterOptions = {
  [OverviewFilterOptions.modelName]: 'Model name',
  [OverviewFilterOptions.project]: 'Project',
  [OverviewFilterOptions.groupName]: 'Group name',
  [OverviewFilterOptions.subscriptionName]: 'Subscription name',
  [OverviewFilterOptions.authPolicyName]: 'Authorization policy name',
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
