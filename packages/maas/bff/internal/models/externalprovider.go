package models

// AuthMechanism matches ExternalProvider spec.auth.type in the inference CRD.
type AuthMechanism string

const (
	AuthMechanismAPIKey AuthMechanism = "apikey"
	AuthMechanismSigV4  AuthMechanism = "sigv4"
	AuthMechanismOAuth2 AuthMechanism = "oauth2"
)

// IsValid reports whether the auth mechanism is a supported CRD value.
func (a AuthMechanism) IsValid() bool {
	switch a {
	case AuthMechanismAPIKey, AuthMechanismSigV4, AuthMechanismOAuth2:
		return true
	default:
		return false
	}
}

// ExternalProviderDetails contains ExternalProvider fields not present on ExternalModel providerRefs.
type ExternalProviderDetails struct {
	DisplayName         string            `json:"displayName,omitempty"`
	Description         string            `json:"description,omitempty"`
	EndpointUrl         string            `json:"endpointUrl"`
	AuthMechanism       AuthMechanism     `json:"authMechanism"`
	CredentialSecretRef string            `json:"credentialSecretRef"`
	Provider            string            `json:"provider"`
	Config              map[string]string `json:"config,omitempty"`
	Phase               string            `json:"phase,omitempty"`
	StatusMessage       string            `json:"statusMessage,omitempty"`
}

// ExternalProviderSummary is the BFF representation of an ExternalProvider CR.
type ExternalProviderSummary struct {
	Name                string            `json:"name"`
	Namespace           string            `json:"namespace"`
	DisplayName         string            `json:"displayName,omitempty"`
	Description         string            `json:"description,omitempty"`
	EndpointUrl         string            `json:"endpointUrl"`
	AuthMechanism       AuthMechanism     `json:"authMechanism"`
	CredentialSecretRef string            `json:"credentialSecretRef"`
	Provider            string            `json:"provider"`
	Config              map[string]string `json:"config,omitempty"`
	Phase               string            `json:"phase,omitempty"`
	StatusMessage       string            `json:"statusMessage,omitempty"`
}
