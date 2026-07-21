package models

type Provider struct {
	ID                  string            `json:"id"`
	Name                string            `json:"name"`
	Type                string            `json:"type"`
	Labels              map[string]string `json:"labels,omitempty"`
	CredentialExpiresAt string            `json:"credentialExpiresAt,omitempty"`
	ProfileName         string            `json:"profileName,omitempty"`
}

type ProviderDetail struct {
	Provider
	Config      map[string]string `json:"config,omitempty"`
	Credentials map[string]string `json:"credentials,omitempty"`
}

type ProviderListResponse struct {
	Providers []Provider `json:"providers"`
}

type CreateProviderRequest struct {
	Name        string            `json:"name"`
	ProfileName string            `json:"profileName"`
	Credentials map[string]string `json:"credentials"`
	Config      map[string]string `json:"config,omitempty"`
	Labels      map[string]string `json:"labels,omitempty"`
}

type UpdateProviderRequest struct {
	Credentials map[string]string `json:"credentials,omitempty"`
	Config      map[string]string `json:"config,omitempty"`
	Labels      map[string]string `json:"labels,omitempty"`
}

type ProviderProfile struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description,omitempty"`
	Credentials []ProviderProfileField `json:"credentials"`
}

type ProviderProfileField struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	Required    bool   `json:"required"`
	Secret      bool   `json:"secret"`
}

type ProviderProfileListResponse struct {
	Profiles []ProviderProfile `json:"profiles"`
}
