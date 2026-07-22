export type Provider = {
  id: string;
  name: string;
  type: string;
  profileName?: string;
  credentialExpiresAt?: string;
};

export type ProviderList = {
  providers: Provider[];
};

export type ProviderProfileField = {
  name: string;
  description?: string;
  required: boolean;
  secret: boolean;
};

export type ProviderProfile = {
  name: string;
  description?: string;
  credentials: ProviderProfileField[];
};

export type ProviderProfileList = {
  profiles: ProviderProfile[];
};

export type CreateProviderRequest = {
  name: string;
  profileName: string;
  credentials: Record<string, string>;
  config: Record<string, string>;
};
