package models

type FeatureFlags struct {
	Terminal          bool `json:"terminal"`
	FileTransfer      bool `json:"fileTransfer"`
	Settings          bool `json:"settings"`
	GlobalPolicy      bool `json:"globalPolicy"`
	CredentialRefresh bool `json:"credentialRefresh"`
	Services          bool `json:"services"`
	DraftPolicy       bool `json:"draftPolicy"`
}

type AuthConfig struct {
	AuthDisabled bool         `json:"authDisabled"`
	AdminRole    string       `json:"adminRole,omitempty"`
	LogoutURL    string       `json:"logoutUrl,omitempty"`
	Features     FeatureFlags `json:"features"`
}

type CurrentUser struct {
	Subject          string   `json:"subject"`
	DisplayName      string   `json:"displayName,omitempty"`
	Email            string   `json:"email,omitempty"`
	Roles            []string `json:"roles"`
	Scopes           []string `json:"scopes,omitempty"`
	IdentityProvider string   `json:"identityProvider,omitempty"`
}

func DefaultMockAuthConfig() AuthConfig {
	return AuthConfig{
		AuthDisabled: true,
		AdminRole:    "admin",
		Features: FeatureFlags{
			Terminal:          false,
			FileTransfer:      false,
			Settings:          false,
			GlobalPolicy:      false,
			CredentialRefresh: false,
			Services:          false,
			DraftPolicy:       false,
		},
	}
}

func DefaultMockCurrentUser() CurrentUser {
	return CurrentUser{
		Subject:     "mock-user@example.com",
		DisplayName: "Mock User",
		Email:       "mock-user@example.com",
		Roles:       []string{"admin"},
	}
}
