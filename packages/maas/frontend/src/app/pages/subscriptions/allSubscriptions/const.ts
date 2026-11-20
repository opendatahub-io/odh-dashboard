export enum SubscriptionsFilterOptions {
  subscription = 'subscription',
  group = 'group',
  model = 'model',
}

/** Shared subscriptions filters: Model / Group / Subscription typeahead selects. */
export const subscriptionsFilterOptions = {
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
  [SubscriptionsFilterOptions.subscription]: undefined,
  [SubscriptionsFilterOptions.group]: undefined,
  [SubscriptionsFilterOptions.model]: undefined,
};
