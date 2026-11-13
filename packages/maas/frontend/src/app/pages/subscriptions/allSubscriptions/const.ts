export enum SubscriptionsFilterOptions {
  subscription = 'subscription',
  group = 'group',
  model = 'model',
}

/** Shared subscriptions filters: Subscription / Group / Model typeahead selects. */
export const subscriptionsFilterOptions = {
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
  [SubscriptionsFilterOptions.subscription]: undefined,
  [SubscriptionsFilterOptions.group]: undefined,
  [SubscriptionsFilterOptions.model]: undefined,
};
