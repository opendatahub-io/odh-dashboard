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

/** Model access viewer and governance subscriptions tab: Model / Group / Subscription typeahead selects. */
export const modelAccessFilterOptions = {
  [SubscriptionsFilterOptions.model]: 'Model',
  [SubscriptionsFilterOptions.group]: 'Group',
  [SubscriptionsFilterOptions.subscription]: 'Subscription',
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
