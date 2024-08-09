export const connectionTypesPageTitle = 'Connection types';
export const connectionTypesPageDescription =
  'Create and manage connection types for users in your organization. Connection types include customizable fields and optional default values to decrease the time required to add connections to data sources and sinks.';

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
