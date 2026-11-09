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

/** Model access viewer: subscription text search, plus group and model selections. */
export const modelAccessFilterOptions = {
  [SubscriptionsFilterOptions.subscription]: 'Subscription',
  [SubscriptionsFilterOptions.group]: 'Group',
  [SubscriptionsFilterOptions.model]: 'Model',
};

/** Distinguishes a model substring query from a selected Kubernetes resource name. */
export const MODEL_TEXT_FILTER_PREFIX = 'model-text:';

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
