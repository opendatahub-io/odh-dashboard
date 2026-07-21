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
};

export type ProviderRef = {
  providerName: string;
  weight: number;
  apiFormat: string;
  path: string;
  targetModel: string;
  config?: Record<string, string>;
  provider?: ExternalProviderDetails;
};

export type ExternalModelMaaSModelRefStatus = {
  phase?: string;
  endpoint?: string;
  statusMessage?: string;
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
  maaSModelRef?: ExternalModelMaaSModelRefStatus;
};
