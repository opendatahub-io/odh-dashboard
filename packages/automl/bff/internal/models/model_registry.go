package models

// ModelRegistry represents a single Model Registry instance discovered from the cluster.
type ModelRegistry struct {
	// ID is the Kubernetes UID of the ModelRegistry CR.
	ID string `json:"id"`

	// Name is the CR name, which also matches the service name in the registries namespace.
	Name string `json:"name"`

	// DisplayName is taken from the openshift.io/display-name annotation, falling back to Name.
	// Always present — never empty.
	DisplayName string `json:"display_name"`

	// Description is taken from the openshift.io/description annotation.
	// Optional — omitted when the annotation is absent.
	Description string `json:"description,omitempty"`

	// IsReady indicates whether the ModelRegistry has Available=True in its status conditions.
	IsReady bool `json:"is_ready"`

	// ServerURL is the full in-cluster REST API base URL for this registry.
	// Derived from status.hosts (set by the operator) — the full cluster-local FQDN is
	// preferred as it works regardless of the cluster's DNS search domain.
	// Callers should append resource paths (e.g. /registered_models) to this URL.
	// Example: https://my-registry.rhoai-model-registries.svc.cluster.local:8443/api/model_registry/v1alpha3
	ServerURL string `json:"server_url"`

	// ExternalURL is the public Route URL for the registry, if a serviceRoute is enabled.
	// Empty when no Route is configured. Can be used for external access from outside the cluster.
	// Example: https://my-registry-rest.apps.cluster.example.com/api/model_registry/v1alpha3
	ExternalURL string `json:"external_url,omitempty"`
}

// ModelRegistriesData wraps the model registry list for the API response.
// Note: Always create a bespoke type for list types; this creates minimal work later if
// implementing pagination, as the necessary metadata can be added without breaking the API.
type ModelRegistriesData struct {
	ModelRegistries []ModelRegistry `json:"model_registries"`
}
