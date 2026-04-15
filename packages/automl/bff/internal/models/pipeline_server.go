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

// ObjectStorage captures the DSPA objectStorage spec fields needed to connect to S3.
type ObjectStorage struct {
	ExternalStorage *ExternalStorage `json:"externalStorage,omitempty"`
	Minio           *MinioStorage    `json:"minio,omitempty"`
}

// ExternalStorage holds the external S3-compatible storage configuration.
type ExternalStorage struct {
	Host                string               `json:"host,omitempty"`
	Port                string               `json:"port,omitempty"`
	Scheme              string               `json:"scheme,omitempty"`
	Region              string               `json:"region,omitempty"`
	Bucket              string               `json:"bucket,omitempty"`
	S3CredentialsSecret *S3CredentialsSecret `json:"s3CredentialsSecret,omitempty"`
}

// S3CredentialsSecret references the Kubernetes Secret and the field names within it.
type S3CredentialsSecret struct {
	SecretName string `json:"secretName,omitempty"`
	AccessKey  string `json:"accessKey,omitempty"` // field NAME inside the secret
	SecretKey  string `json:"secretKey,omitempty"` // field NAME inside the secret
}

// MinioStorage holds the managed MinIO storage configuration.
// When deploy is true, the DSPA operator creates a MinIO instance with a secret
// named "ds-pipeline-s3-{dspa-name}" containing S3-compatible credentials.
type MinioStorage struct {
	Deploy bool   `json:"deploy,omitempty"`
	Bucket string `json:"bucket,omitempty"`
	Image  string `json:"image,omitempty"`
	PvcSize string `json:"pvcSize,omitempty"`
}

// DSPAObjectStorage is the resolved object-storage configuration extracted from a
// DSPipelineApplication spec. It is stored in request context under
// constants.DSPAObjectStorageKey so handlers can access it without additional
// Kubernetes API calls.
type DSPAObjectStorage struct {
	SecretName     string // name of the Kubernetes Secret holding the credentials
	AccessKeyField string // key inside SecretName that holds the access key ID
	SecretKeyField string // key inside SecretName that holds the secret access key
	EndpointURL    string // fully constructed endpoint: scheme://host[:port]
	Bucket         string // default bucket from the DSPA spec
	Region         string // S3-compatible region
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
