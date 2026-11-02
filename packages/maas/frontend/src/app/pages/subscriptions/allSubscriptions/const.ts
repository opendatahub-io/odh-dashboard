export enum SubscriptionsFilterOptions {
  keyword = 'keyword',
  subscription = 'subscription',
  group = 'group',
  model = 'model',
}

/** MaaS governance subscriptions tab: free-text keyword search. */
export const subscriptionsFilterOptions = {
  [SubscriptionsFilterOptions.keyword]: 'Keyword',
};

/** Model access viewer: Subscription / Group / Model typeahead selects. */
export const modelAccessFilterOptions = {
  [SubscriptionsFilterOptions.subscription]: 'Subscription',
  [SubscriptionsFilterOptions.group]: 'Group',
  [SubscriptionsFilterOptions.model]: 'Model',
};

export type SubscriptionsFilterSelection = { label: string; value: string };

export type SubscriptionsFilterDataType = Record<
  SubscriptionsFilterOptions,
  string | SubscriptionsFilterSelection | undefined
>;

export const initialSubscriptionsFilterData: SubscriptionsFilterDataType = {
  [SubscriptionsFilterOptions.keyword]: '',
  [SubscriptionsFilterOptions.subscription]: undefined,
  [SubscriptionsFilterOptions.group]: undefined,
  [SubscriptionsFilterOptions.model]: undefined,
};
