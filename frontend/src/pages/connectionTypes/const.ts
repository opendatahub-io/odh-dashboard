export enum ConnectionTypesOptions {
  keyword = 'Keyword',
  createdBy = 'Created by',
}

export const options = {
  [ConnectionTypesOptions.keyword]: 'Keyword',
  [ConnectionTypesOptions.createdBy]: 'Created By',
};

export type FilterDataType = Record<ConnectionTypesOptions, string | undefined>;

export const initialFilterData: Record<ConnectionTypesOptions, string | undefined> = {
  [ConnectionTypesOptions.keyword]: '',
  [ConnectionTypesOptions.createdBy]: '',
};
