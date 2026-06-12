package models

import "encoding/json"

// PipelineRun represents a Kubeflow Pipeline Run from the v2beta1 API
// This is the stable public API format exposed to the frontend
type PipelineRun struct {
	RunID                    string                    `json:"run_id"`
	DisplayName              string                    `json:"display_name"`
	Description              string                    `json:"description,omitempty"`
	ExperimentID             string                    `json:"experiment_id,omitempty"`
	PipelineVersionReference *PipelineVersionReference `json:"pipeline_version_reference,omitempty"`
	RuntimeConfig            *RuntimeConfig            `json:"runtime_config,omitempty"`
	State                    string                    `json:"state"`
	StorageState             string                    `json:"storage_state,omitempty"`
	ServiceAccount           string                    `json:"service_account,omitempty"`
	CreatedAt                string                    `json:"created_at"`
	ScheduledAt              string                    `json:"scheduled_at,omitempty"`
	FinishedAt               string                    `json:"finished_at,omitempty"`
	PipelineSpec             json.RawMessage           `json:"pipeline_spec,omitempty"`
	StateHistory             []RuntimeStatus           `json:"state_history,omitempty"`
	Error                    *ErrorInfo                `json:"error,omitempty"`
	RunDetails               *RunDetails               `json:"run_details,omitempty"`
	PipelineType             string                    `json:"pipeline_type,omitempty"`
}

// PipelineVersionReference contains pipeline and version IDs
type PipelineVersionReference struct {
	PipelineID        string `json:"pipeline_id,omitempty"`
	PipelineVersionID string `json:"pipeline_version_id,omitempty"`
}

// PipelineRunsData contains a list of pipeline runs with pagination
type PipelineRunsData struct {
	Runs          []PipelineRun `json:"runs"`
	TotalSize     int32         `json:"total_size,omitempty"`
	NextPageToken string        `json:"next_page_token,omitempty"`
}

// KFPipelineRunResponse represents the response from Kubeflow Pipelines API
// This is the internal format that Kubeflow returns
type KFPipelineRunResponse struct {
	Runs          []KFPipelineRun `json:"runs,omitempty"`
	TotalSize     int32           `json:"total_size,omitempty"`
	NextPageToken string          `json:"next_page_token,omitempty"`
}

// KFPipelineRun represents a single run from Kubeflow Pipelines API v2beta1
type KFPipelineRun struct {
	RunID                    string                    `json:"run_id"`
	DisplayName              string                    `json:"display_name"`
	Description              string                    `json:"description,omitempty"`
	ExperimentID             string                    `json:"experiment_id,omitempty"`
	PipelineVersionReference *PipelineVersionReference `json:"pipeline_version_reference,omitempty"`
	RuntimeConfig            *RuntimeConfig            `json:"runtime_config,omitempty"`
	ServiceAccount           string                    `json:"service_account,omitempty"`
	State                    string                    `json:"state,omitempty"`
	StorageState             string                    `json:"storage_state,omitempty"`
	CreatedAt                string                    `json:"created_at,omitempty"`
	ScheduledAt              string                    `json:"scheduled_at,omitempty"`
	FinishedAt               string                    `json:"finished_at,omitempty"`
	PipelineSpec             json.RawMessage           `json:"pipeline_spec,omitempty"`
	StateHistory             []RuntimeStatus           `json:"state_history,omitempty"`
	Error                    *ErrorInfo                `json:"error,omitempty"`
	RunDetails               *RunDetails               `json:"run_details,omitempty"`
}

// RuntimeConfig represents the runtime configuration
type RuntimeConfig struct {
	Parameters   map[string]interface{} `json:"parameters,omitempty"`
	PipelineRoot string                 `json:"pipeline_root,omitempty"`
}

// RuntimeStatus represents runtime state information
type RuntimeStatus struct {
	UpdateTime string     `json:"update_time,omitempty"`
	State      string     `json:"state,omitempty"`
	Error      *ErrorInfo `json:"error,omitempty"`
}

// ErrorInfo represents an error in the pipeline run
type ErrorInfo struct {
	Code    int32  `json:"code,omitempty"`
	Message string `json:"message,omitempty"`
}

// RunDetails contains detailed execution information about a pipeline run
type RunDetails struct {
	TaskDetails []TaskDetail `json:"task_details,omitempty"`
}

// TaskDetail represents a single task/component execution within a pipeline run
type TaskDetail struct {
	RunID        string          `json:"run_id,omitempty"`
	TaskID       string          `json:"task_id"`
	DisplayName  string          `json:"display_name,omitempty"`
	CreateTime   string          `json:"create_time,omitempty"`
	StartTime    string          `json:"start_time,omitempty"`
	EndTime      string          `json:"end_time,omitempty"`
	State        string          `json:"state,omitempty"`
	ExecutionID  string          `json:"execution_id,omitempty"`
	StateHistory []RuntimeStatus `json:"state_history,omitempty"`
	ChildTasks   []ChildTask     `json:"child_tasks,omitempty"`
	Error        *ErrorInfo      `json:"error,omitempty"`
}

// ChildTask represents a child task reference
type ChildTask struct {
	PodName string `json:"pod_name,omitempty"`
}

// CreateAutoRAGRunRequest is the BFF-level input for creating an AutoRAG pipeline run.
type CreateAutoRAGRunRequest struct {
	DisplayName                string   `json:"display_name"`
	Description                string   `json:"description,omitempty"`
	TestDataSecretName         string   `json:"test_data_secret_name"`
	TestDataBucketName         string   `json:"test_data_bucket_name"`
	TestDataKey                string   `json:"test_data_key"`
	InputDataSecretName        string   `json:"input_data_secret_name"`
	InputDataBucketName        string   `json:"input_data_bucket_name"`
	InputDataKey               string   `json:"input_data_key"`
	OGXSecretName              string   `json:"ogx_secret_name"`
	EmbeddingModels            []string `json:"embedding_models,omitempty"`
	GenerationModels           []string `json:"generation_models,omitempty"`
	OptimizationMetric         string   `json:"optimization_metric,omitempty"`
	VectorIOProviderID         string   `json:"vector_io_provider_id,omitempty"`
	OptimizationMaxRagPatterns *int     `json:"optimization_max_rag_patterns,omitempty"`
}

// KFPipeline represents a pipeline definition from the KFP v2beta1 API.
// Used by pipeline discovery to identify managed AutoRAG pipelines in a namespace.
type KFPipeline struct {
	PipelineID  string            `json:"pipeline_id"`  // Unique pipeline identifier
	DisplayName string            `json:"display_name"` // Human-readable pipeline name (used for discovery matching)
	Description string            `json:"description,omitempty"`
	CreatedAt   string            `json:"created_at,omitempty"` // ISO 8601 timestamp
	Namespace   string            `json:"namespace,omitempty"`
	Tags        map[string]string `json:"tags,omitempty"` // Pipeline tags (e.g. {"managed": "true"})
}

// KFPipelineVersion represents a version of a pipeline from the KFP v2beta1 API.
// Used by pipeline discovery (ListPipelineVersions) and topology enrichment (GetPipelineVersion).
// The PipelineSpec field is only populated by GetPipelineVersion (single-version endpoint).
type KFPipelineVersion struct {
	PipelineID        string          `json:"pipeline_id"`         // ID of the parent pipeline
	PipelineVersionID string          `json:"pipeline_version_id"` // Unique version identifier
	DisplayName       string          `json:"display_name"`        // Human-readable version name (e.g., "v1.0.0")
	Description       string          `json:"description,omitempty"`
	CreatedAt         string          `json:"created_at,omitempty"`    // ISO 8601 timestamp
	PipelineSpec      json.RawMessage `json:"pipeline_spec,omitempty"` // DAG definition (only from GetPipelineVersion)
}

// KFPipelinesResponse represents the response from GET /apis/v2beta1/pipelines.
// Returned by PipelineServerClient.ListPipelines() for pipeline discovery.
type KFPipelinesResponse struct {
	Pipelines     []KFPipeline `json:"pipelines,omitempty"`       // List of pipeline definitions
	TotalSize     int32        `json:"total_size,omitempty"`      // Total number of pipelines available
	NextPageToken string       `json:"next_page_token,omitempty"` // Pagination token for next page
}

// KFPipelineVersionsResponse represents the response from GET /apis/v2beta1/pipelines/{id}/versions.
// Returned by PipelineServerClient.ListPipelineVersions() for version discovery.
type KFPipelineVersionsResponse struct {
	PipelineVersions []KFPipelineVersion `json:"pipeline_versions,omitempty"` // List of versions for a pipeline
	TotalSize        int32               `json:"total_size,omitempty"`        // Total number of versions available
	NextPageToken    string              `json:"next_page_token,omitempty"`   // Pagination token for next page
}

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
	Deploy  bool   `json:"deploy,omitempty"`
	Bucket  string `json:"bucket,omitempty"`
	Image   string `json:"image,omitempty"`
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
