package models

// DSPipelineApplication represents the Kubeflow DSPipelineApplication CR
// This matches the structure from the Data Science Pipelines Operator
type DSPipelineApplication struct {
	APIVersion string                        `json:"apiVersion"`
	Kind       string                        `json:"kind"`
	Metadata   DSPipelineApplicationMetadata `json:"metadata"`
	Spec       *DSPipelineApplicationSpec    `json:"spec,omitempty"`
	Status     *DSPipelineApplicationStatus  `json:"status,omitempty"`
}

type DSPipelineApplicationMetadata struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
}

type DSPipelineApplicationSpec struct {
	APIServer     *APIServer     `json:"apiServer,omitempty"`
	ObjectStorage *ObjectStorage `json:"objectStorage,omitempty"`
}

type APIServer struct {
	Deploy bool `json:"deploy,omitempty"`
}

// ObjectStorage captures just enough of the DSPA spec to surface the storage secret name.
type ObjectStorage struct {
	ExternalStorage *ExternalStorage `json:"externalStorage,omitempty"`
}

// ExternalStorage holds the external S3-compatible storage reference.
type ExternalStorage struct {
	S3CredentialsSecret *S3CredentialsSecret `json:"s3CredentialsSecret,omitempty"`
}

// S3CredentialsSecret holds the name of the Kubernetes Secret containing the S3 credentials.
type S3CredentialsSecret struct {
	SecretName string `json:"secretName,omitempty"`
}

type DSPipelineApplicationStatus struct {
	Ready      bool                             `json:"ready"`
	Conditions []DSPipelineApplicationCondition `json:"conditions,omitempty"`
	Components *DSPipelineApplicationComponents `json:"components,omitempty"`
}

type DSPipelineApplicationComponents struct {
	APIServer *DSPipelineApplicationAPIServerStatus `json:"apiServer,omitempty"`
}

type DSPipelineApplicationAPIServerStatus struct {
	URL         string `json:"url,omitempty"`
	ExternalURL string `json:"externalUrl,omitempty"`
}

type DSPipelineApplicationCondition struct {
	Type    string `json:"type"`
	Status  string `json:"status"`
	Reason  string `json:"reason,omitempty"`
	Message string `json:"message,omitempty"`
}
