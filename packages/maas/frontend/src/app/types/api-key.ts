export type APIKeyStatus = 'active' | 'expired';

export type APIKey = {
  id: string;
  name: string;
  description: string;
  creationDate: string; // ISO 8601 date string
  expirationDate: string; // ISO 8601 date string
  status: APIKeyStatus;
};

export type CreateAPIKeyResponse = {
  token: string;
  expiration: string;
  expiresAt: number;
  jti: string;
  name: string;
  description: string;
};

export type CreateAPIKeyRequest = {
  name: string;
  description?: string;
  expiration?: string;
};
