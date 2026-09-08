export type AuthMechanism = 'apikey' | 'sigv4' | 'oauth2';

export type ExternalProviderDetails = {
  displayName?: string;
  description?: string;
  endpointUrl: string;
  authMechanism: AuthMechanism;
  credentialSecretRef: string;
  provider: string;
  config?: Record<string, string>;
  phase?: string;
  statusMessage?: string;
  reason?: string;
  status?: string;
  conditionType?: string;
  lastTransitionTime?: string;
};

export type ProviderRef = {
  providerName: string;
  weight: number;
  apiFormat: string;
  path: string;
  targetModel: string;
  config?: Record<string, string>;
  authMechanism?: AuthMechanism;
  credentialSecretRef?: string;
  provider?: ExternalProviderDetails;
};

export type ExternalModelMaaSModelRefStatus = {
  phase?: string;
  endpoint?: string;
  statusMessage?: string;
  reason?: string;
  governanceAttached?: boolean;
};

export type ExternalModel = {
  name: string;
  namespace: string;
  displayName?: string;
  description?: string;
  modelName?: string;
  providerRefs: ProviderRef[];
  phase?: string;
  statusMessage?: string;
  reason?: string;
  status?: string;
  conditionType?: string;
  lastTransitionTime?: string;
  maaSModelRef?: ExternalModelMaaSModelRefStatus;
};

export type CreateExternalModelRequest = {
  name: string;
  namespace: string;
  displayName?: string;
  description?: string;
  modelName?: string;
  providerRefs: ProviderRef[];
};

export type UpdateExternalModelRequest = {
  displayName?: string;
  description?: string;
  modelName?: string;
  providerRefs?: ProviderRef[];
};

export type ExternalProvider = {
  name: string;
  namespace: string;
  displayName?: string;
  description?: string;
  endpointUrl: string;
  authMechanism: AuthMechanism;
  credentialSecretRef: string;
  provider: string;
  config?: Record<string, string>;
  phase?: string;
  statusMessage?: string;
  reason?: string;
  lastTransitionTime?: string;
  conditionType?: string;
  status?: string;
};

export enum ProviderTypes {
  OpenAI = 'OpenAI',
  Anthropic = 'Anthropic',
  AWSBedrock = 'AWS Bedrock',
  Azure = 'Azure',
  GoogleVertexAI = 'Google Vertex AI',
}

export type CreateExternalProviderRequest = {
  name: string;
  namespace: string;
  displayName?: string;
  description?: string;
  endpointUrl: string;
  authMechanism: AuthMechanism;
  credentialSecretRef: string;
  provider: string;
  config?: Record<string, string>;
};

export type UpdateExternalProviderRequest = {
  displayName?: string;
  description?: string;
  endpointUrl?: string;
  authMechanism?: AuthMechanism;
  credentialSecretRef?: string;
  config?: Record<string, string>;
};

export type SecretSummary = {
  name: string;
};

export type CreateSecretRequest = {
  namespace: string;
  name: string;
  value: string;
};

export type CreateSecretResponse = {
  name: string;
};
