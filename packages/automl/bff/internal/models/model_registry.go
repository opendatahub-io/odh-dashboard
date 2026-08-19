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

// RegisterModelRequest is the BFF-level input for registering a model binary in the Model Registry.
// It contains the S3 path to the model artifact and metadata for creating a RegisteredModel,
// ModelVersion, and ModelArtifact in the Model Registry.
// The target registry is identified by the :registryId path parameter, not in the request body.
type RegisterModelRequest struct {
	// S3Path is the relative S3 object key where the model binary is stored
	// (e.g., "pipeline/run/.../predictor"). The BFF resolves the bucket, endpoint,
	// and region from the DSPA object storage config and constructs the full URI
	// in the format expected by the Model Registry UI.
	S3Path string `json:"s3_path"`

	// ModelName is the name of the registered model. Must be unique within the Model Registry.
	ModelName string `json:"model_name"`

	// ModelDescription is an optional description of the model.
	ModelDescription string `json:"model_description,omitempty"`

	// VersionName is the name of the model version (e.g., "v1", "1.0.0").
	VersionName string `json:"version_name"`

	// VersionDescription is an optional description of this version.
	VersionDescription string `json:"version_description,omitempty"`

	// ArtifactName is the name for the ModelArtifact. Defaults to version name if empty.
	ArtifactName string `json:"artifact_name,omitempty"`

	// ArtifactDescription is an optional description of the artifact.
	ArtifactDescription string `json:"artifact_description,omitempty"`

	// ModelFormatName is optional (e.g., "onnx", "pytorch", "tensorflow").
	ModelFormatName string `json:"model_format_name,omitempty"`

	// ModelFormatVersion is optional (e.g., "1.0").
	ModelFormatVersion string `json:"model_format_version,omitempty"`
}
