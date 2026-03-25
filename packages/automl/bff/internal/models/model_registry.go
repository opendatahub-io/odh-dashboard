package models

// ModelRegistry represents a single Model Registry instance discovered from the cluster.
type ModelRegistry struct {
	// ID is the Kubernetes UID of the ModelRegistry CR.
	ID string `json:"id"`

	// Name is the CR name, which also matches the service name in the registries namespace.
	Name string `json:"name"`

	// DisplayName is taken from the openshift.io/display-name annotation, falling back to Name.
	DisplayName string `json:"display_name,omitempty"`

	// Description is taken from the openshift.io/description annotation.
	Description string `json:"description,omitempty"`

	// IsReady indicates whether the ModelRegistry has a Ready=True condition.
	IsReady bool `json:"is_ready"`

	// ServerURL is the full REST API base URL for this registry, constructed from
	// the service name and registries namespace reported in the CR status.
	// Callers should append /registered_models, /model_versions, etc. to this URL.
	// Example: https://my-registry.rhoai-model-registries.svc.cluster.local:8443/api/model_registry/v1alpha3
	ServerURL string `json:"server_url"`
}

// ModelRegistriesData wraps the model registry list for the API response.
// Note: Always create a bespoke type for list types; this creates minimal work later if
// implementing pagination, as the necessary metadata can be added without breaking the API.
type ModelRegistriesData struct {
	ModelRegistries []ModelRegistry `json:"model_registries"`
}
