export type APIKeyStatus = 'active' | 'expired';

export type APIKey = {
  id: string;
  name: string;
  description: string;
  creationDate: string; // ISO 8601 date string
  expirationDate: string; // ISO 8601 date string
  status: APIKeyStatus;
};
