export enum SubscriptionsFilterOptions {
  keyword = 'keyword',
}

export const subscriptionsFilterOptions = {
  [SubscriptionsFilterOptions.keyword]: 'Keyword',
};

export type SubscriptionsFilterDataType = Record<SubscriptionsFilterOptions, string | undefined>;

export const initialSubscriptionsFilterData: SubscriptionsFilterDataType = {
  [SubscriptionsFilterOptions.keyword]: '',
};
