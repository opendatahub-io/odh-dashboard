export enum SubscriptionsFilterOptions {
  subscription = 'subscription',
  group = 'group',
  model = 'model',
}

/** Shared subscriptions filters: subscription text search, plus group and model selections. */
export const subscriptionsFilterOptions = {
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
  [SubscriptionsFilterOptions.subscription]: undefined,
  [SubscriptionsFilterOptions.group]: undefined,
  [SubscriptionsFilterOptions.model]: undefined,
};
