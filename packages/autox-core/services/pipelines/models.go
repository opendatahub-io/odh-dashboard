package pipelines

import "time"

// PipelineRun represents a Kubeflow Pipelines run
type PipelineRun struct {
	RunID             string
	DisplayName       string
	PipelineID        string
	PipelineVersionID string
	Status            string
	CreatedAt         *time.Time
	FinishedAt        *time.Time
	RuntimeConfig     *RuntimeConfig
	Error             *RunError
}

// RuntimeConfig holds runtime parameters for a pipeline run
type RuntimeConfig struct {
	Parameters   map[string]interface{}
	PipelineRoot string
}

// RunError captures error details from a failed pipeline run
type RunError struct {
	Code    string
	Message string
}

// CreatePipelineRunRequest is the request payload for creating a pipeline run
type CreatePipelineRunRequest struct {
	DisplayName       string
	PipelineID        string
	PipelineVersionID string
	RuntimeConfig     *RuntimeConfig
}

// PipelineRunResponse wraps a list of pipeline runs with pagination
type PipelineRunResponse struct {
	Runs          []PipelineRun
	TotalSize     int32
	NextPageToken string
}

// Pipeline represents a Kubeflow Pipeline
type Pipeline struct {
	PipelineID  string
	DisplayName string
	Description string
	CreatedAt   time.Time
}

// PipelineVersion represents a version of a pipeline
type PipelineVersion struct {
	PipelineVersionID string
	PipelineID        string
	DisplayName       string
	Description       string
	CreatedAt         time.Time
	PipelineSpec      *string
}

// PipelinesResponse wraps a list of pipelines
type PipelinesResponse struct {
	Pipelines     []Pipeline
	TotalSize     int32
	NextPageToken string
}

// PipelineVersionsResponse wraps a list of pipeline versions
type PipelineVersionsResponse struct {
	PipelineVersions []PipelineVersion
	TotalSize        int32
	NextPageToken    string
}

// ListRunsParams contains parameters for listing pipeline runs
type ListRunsParams struct {
	PageSize  int32
	PageToken string
	SortBy    string
	Filter    string
}

// DSPA (Data Science Pipelines Application) models

// DSPAStatus represents the status of a DSPA instance
type DSPAStatus struct {
	Ready        bool
	APIServerURL string
	ExternalURL  string
	Conditions   []DSPACondition
}

// DSPACondition represents a condition in DSPA status
type DSPACondition struct {
	Type    string
	Status  string
	Reason  string
	Message string
}

// DSPAObjectStorage holds the resolved object storage configuration from a DSPA
type DSPAObjectStorage struct {
	SecretName     string // name of the Kubernetes Secret holding the credentials
	AccessKeyField string // key inside SecretName that holds the access key ID
	SecretKeyField string // key inside SecretName that holds the secret access key
	EndpointURL    string // fully constructed endpoint: scheme://host[:port]
	Bucket         string // default bucket from the DSPA spec
	Region         string // S3-compatible region
}
