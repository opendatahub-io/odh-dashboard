export type APIKeyStatus = 'active' | 'expired';

export type APIKey = {
  id: string;
  name: string;
  description?: string;
  creationDate: string; // ISO 8601 date string
  expirationDate: string; // ISO 8601 date string
  status: APIKeyStatus;
};

export type CreateAPIKeyResponse = {
  token: string;
  expiration: string;
  expiresAt: number;
  jti?: string;
  name?: string;
  description?: string;
};

export type CreateAPIKeyRequest = {
  name?: string; // Optional, if omitted, the key will be ephemeral and not tracked in the metadata store
  description?: string;
  expiration?: string;
};
