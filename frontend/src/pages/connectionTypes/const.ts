export enum ConnectionTypesOptions {
  keyword = 'Keyword',
  category = 'Category',
  creator = 'Creator',
}

export const options = {
  [ConnectionTypesOptions.keyword]: 'Keyword',
  [ConnectionTypesOptions.category]: 'Category',
  [ConnectionTypesOptions.creator]: 'Creator',
};

export type FilterDataType = Record<ConnectionTypesOptions, string | undefined>;

export const initialFilterData: Record<ConnectionTypesOptions, string | undefined> = {
  [ConnectionTypesOptions.keyword]: '',
  [ConnectionTypesOptions.category]: '',
  [ConnectionTypesOptions.creator]: '',
};

export const categoryOptions = ['Object storage', 'Database', 'Model registry', 'URI'];
