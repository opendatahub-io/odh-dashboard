package models

// RegisterModelRequest is the BFF-level input for registering a model binary in the Model Registry.
// It contains the S3 path to the model artifact and metadata for creating a RegisteredModel,
// ModelVersion, and ModelArtifact in the Model Registry.
// The target registry is identified by the :registryId path parameter, not in the request body.
type RegisterModelRequest struct {
	// S3Path is the S3 URI where the model binary is stored (e.g., s3://bucket/path/to/model).
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
