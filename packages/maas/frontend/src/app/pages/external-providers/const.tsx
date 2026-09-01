export const externalProvidersManagementPath = (namespace: string): string =>
  `/ai-hub/models/deployments/external-providers/${namespace}`;

export enum ExternalProvidersFilterOptions {
  status = 'status',
  providerType = 'providerType',
  authentication = 'authentication',
  name = 'name',
}

export const externalProvidersFilterOptions = {
  [ExternalProvidersFilterOptions.name]: 'Name',
  [ExternalProvidersFilterOptions.providerType]: 'Provider type',
  [ExternalProvidersFilterOptions.authentication]: 'Authentication',
  [ExternalProvidersFilterOptions.status]: 'Status',
};

export type ExternalProvidersFilterDataType = Record<
  ExternalProvidersFilterOptions,
  string | undefined
>;

export const initialExternalProvidersFilterData: ExternalProvidersFilterDataType = {
  [ExternalProvidersFilterOptions.name]: '',
  [ExternalProvidersFilterOptions.providerType]: '',
  [ExternalProvidersFilterOptions.authentication]: '',
  [ExternalProvidersFilterOptions.status]: '',
};
