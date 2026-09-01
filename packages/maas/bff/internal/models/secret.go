package models

// SecretSummary is a Kubernetes Secret name (values are never returned).
type SecretSummary struct {
	Name string `json:"name"`
}

// CreateSecretRequest is the request body for creating a Secret.
type CreateSecretRequest struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
	Value     string `json:"value"`
}

// CreateSecretResponse is returned after creating a Secret.
type CreateSecretResponse struct {
	Name string `json:"name"`
}
