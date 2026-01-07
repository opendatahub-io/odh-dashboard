export type APIKeyStatus = 'active' | 'expired';

export type APIKey = {
  id: string;
  name: string;
  description: string;
  creationDate: Date;
  expirationDate: Date;
  status: APIKeyStatus;
};
