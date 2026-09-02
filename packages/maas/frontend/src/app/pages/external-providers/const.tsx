export const externalProvidersManagementPath = (namespace: string): string =>
  `/ai-hub/models/deployments/external-providers/${namespace}`;

export enum ExternalProvidersFilterOptions {
  status = 'status',
  providerType = 'providerType',
  authentication = 'authentication',
  name = 'name',
}

export type ExternalProvidersMultiSelectFilterKey =
  | ExternalProvidersFilterOptions.status
  | ExternalProvidersFilterOptions.providerType
  | ExternalProvidersFilterOptions.authentication;

export type ExternalProviderFilterOption = {
  label: string;
  value: string;
};

export const externalProviderTypeFilterOptions: ExternalProviderFilterOption[] = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'Anthropic', value: 'anthropic' },
  { label: 'AWS Bedrock', value: 'aws-bedrock' },
  { label: 'Azure', value: 'azure' },
  { label: 'Google Vertex AI', value: 'google-vertex-ai' },
];

export const externalProviderAuthenticationFilterOptions: ExternalProviderFilterOption[] = [
  { label: 'API key', value: 'apikey' },
  { label: 'Signature Version 4', value: 'sigv4' },
  { label: 'OAuth 2.0', value: 'oauth2' },
];

export const externalProviderStatusFilterOptions: ExternalProviderFilterOption[] = [
  { label: 'Ready', value: 'ready' },
  { label: 'Failed', value: 'failed' },
  { label: 'Invalid', value: 'invalid' },
  { label: 'Pending', value: 'pending' },
];

export const externalProvidersFilterOptions = {
  [ExternalProvidersFilterOptions.name]: 'Name',
  [ExternalProvidersFilterOptions.providerType]: 'Provider type',
  [ExternalProvidersFilterOptions.authentication]: 'Authentication',
  [ExternalProvidersFilterOptions.status]: 'Status',
};

export type ExternalProvidersFilterDataType = {
  [ExternalProvidersFilterOptions.name]: string;
  [ExternalProvidersFilterOptions.providerType]: string[];
  [ExternalProvidersFilterOptions.authentication]: string[];
  [ExternalProvidersFilterOptions.status]: string[];
};

export const initialExternalProvidersFilterData: ExternalProvidersFilterDataType = {
  [ExternalProvidersFilterOptions.name]: '',
  [ExternalProvidersFilterOptions.providerType]: [],
  [ExternalProvidersFilterOptions.authentication]: [],
  [ExternalProvidersFilterOptions.status]: [],
};
