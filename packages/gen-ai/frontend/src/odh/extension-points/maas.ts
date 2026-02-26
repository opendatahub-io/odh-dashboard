export interface MaaSModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  ready: boolean;
  url?: string;
  // Optional fields for display name, description, and use case
  // These may not be provided by all backends, so we use id as fallback for display_name
  display_name?: string;
  description?: string;
  usecase?: string;
}

export type MaaSTokenRequest = {
  name?: string;
  description?: string;
  expiration?: string; // Optional - only present when expiration is provided
};
export interface MaaSTokenResponse {
  token: string;
  expiresAt: number;
}
