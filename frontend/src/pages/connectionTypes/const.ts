export enum ConnectionTypesOptions {
  keyword = 'Keyword',
  category = 'Category',
  createdBy = 'Created by',
}

export const options = {
  [ConnectionTypesOptions.keyword]: 'Keyword',
  [ConnectionTypesOptions.category]: 'Category',
  [ConnectionTypesOptions.createdBy]: 'Created By',
};

export type FilterDataType = Record<ConnectionTypesOptions, string | undefined>;

export const initialFilterData: Record<ConnectionTypesOptions, string | undefined> = {
  [ConnectionTypesOptions.keyword]: '',
  [ConnectionTypesOptions.category]: '',
  [ConnectionTypesOptions.createdBy]: '',
};

export const categoryOptions = ['Object storage', 'Database', 'Model registry', 'URI'];
