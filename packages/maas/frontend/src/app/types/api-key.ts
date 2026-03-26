export type APIKeyStatus = 'active' | 'revoked' | 'expired';

export type APIKey = {
  id: string;
  name: string;
  description?: string;
  username?: string;
  groups?: string[];
  creationDate: string;
  expirationDate?: string;
  status: APIKeyStatus;
  lastUsedAt?: string;
};

export type APIKeyListResponse = {
  object: string;
  data: APIKey[];
  has_more: boolean;
};

export type APIKeySearchRequest = {
  filters?: {
    username?: string;
    status?: APIKeyStatus[];
  };
  sort?: {
    by?: 'created_at' | 'expires_at' | 'last_used_at' | 'name';
    order?: 'asc' | 'desc';
  };
  pagination?: {
    limit?: number;
    offset?: number;
  };
};

export type BulkRevokeResponse = {
  revokedCount: number;
  message: string;
};

export type CreateAPIKeyResponse = {
  key: string;
  keyPrefix: string;
  id: string;
  name: string;
  createdAt: string;
  expiresAt?: string;
};

export type CreateAPIKeyRequest = {
  name: string;
  description?: string;
  expiresIn?: string;
};

export const STATUS_OPTIONS: APIKeyStatus[] = ['active', 'expired', 'revoked'];

export type ApiKeyFilterDataType = {
  username: string;
  statuses: APIKeyStatus[];
};

export const initialApiKeyFilterData: ApiKeyFilterDataType = {
  username: '',
  statuses: [],
};
