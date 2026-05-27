package pipelines

import (
	"encoding/json"
	"time"
)

// PipelineRun represents a Kubeflow Pipelines v2beta1 run.
type PipelineRun struct {
	RunID                    string                    `json:"run_id"`
	DisplayName              string                    `json:"display_name"`
	Description              string                    `json:"description,omitempty"`
	ExperimentID             string                    `json:"experiment_id,omitempty"`
	PipelineVersionReference *PipelineVersionReference `json:"pipeline_version_reference,omitempty"`
	RuntimeConfig            *RuntimeConfig            `json:"runtime_config,omitempty"`
	State                    string                    `json:"state,omitempty"`
	StorageState             string                    `json:"storage_state,omitempty"`
	ServiceAccount           string                    `json:"service_account,omitempty"`
	CreatedAt                string                    `json:"created_at,omitempty"`
	ScheduledAt              string                    `json:"scheduled_at,omitempty"`
	FinishedAt               string                    `json:"finished_at,omitempty"`
	PipelineSpec             json.RawMessage           `json:"pipeline_spec,omitempty"`
	StateHistory             []RuntimeStatus           `json:"state_history,omitempty"`
	Error                    *ErrorInfo                `json:"error,omitempty"`
	RunDetails               *RunDetails               `json:"run_details,omitempty"`
}

// PipelineVersionReference identifies a pipeline and version.
type PipelineVersionReference struct {
	PipelineID        string `json:"pipeline_id,omitempty"`
	PipelineVersionID string `json:"pipeline_version_id,omitempty"`
}

// RuntimeConfig holds runtime parameters for a pipeline run.
type RuntimeConfig struct {
	Parameters   map[string]any `json:"parameters,omitempty"`
	PipelineRoot string         `json:"pipeline_root,omitempty"`
}

// RuntimeStatus represents a state transition in a run's history.
type RuntimeStatus struct {
	UpdateTime string     `json:"update_time,omitempty"`
	State      string     `json:"state,omitempty"`
	Error      *ErrorInfo `json:"error,omitempty"`
}

// ErrorInfo captures error details from a failed pipeline run or task.
type ErrorInfo struct {
	Code    int32  `json:"code,omitempty"`
	Message string `json:"message,omitempty"`
}

// RunDetails contains task-level execution details.
type RunDetails struct {
	TaskDetails []TaskDetail `json:"task_details,omitempty"`
}

// TaskDetail represents a single task's execution within a pipeline run.
type TaskDetail struct {
	RunID        string          `json:"run_id,omitempty"`
	TaskID       string          `json:"task_id"`
	DisplayName  string          `json:"display_name,omitempty"`
	CreateTime   string          `json:"create_time,omitempty"`
	StartTime    string          `json:"start_time,omitempty"`
	EndTime      string          `json:"end_time,omitempty"`
	State        string          `json:"state,omitempty"`
	StateHistory []RuntimeStatus `json:"state_history,omitempty"`
	ChildTasks   []ChildTask     `json:"child_tasks,omitempty"`
	Error        *ErrorInfo      `json:"error,omitempty"`
}

// ChildTask identifies a child task pod.
type ChildTask struct {
	PodName string `json:"pod_name,omitempty"`
}

// CreatePipelineRunInput is the input payload for creating a pipeline run.
type CreatePipelineRunInput struct {
	DisplayName              string                    `json:"display_name"`
	Description              string                    `json:"description,omitempty"`
	PipelineVersionReference *PipelineVersionReference `json:"pipeline_version_reference,omitempty"`
	RuntimeConfig            *RuntimeConfig            `json:"runtime_config,omitempty"`
}

// PipelineRunResponse wraps a list of pipeline runs with pagination.
type PipelineRunResponse struct {
	Runs          []PipelineRun `json:"runs,omitempty"`
	TotalSize     int32         `json:"total_size,omitempty"`
	NextPageToken string        `json:"next_page_token,omitempty"`
}

// Pipeline represents a Kubeflow Pipeline.
type Pipeline struct {
	PipelineID  string `json:"pipeline_id"`
	DisplayName string `json:"display_name"`
	Description string `json:"description,omitempty"`
	CreatedAt   string `json:"created_at,omitempty"`
	Namespace   string `json:"namespace,omitempty"`
}

// PipelineVersion represents a version of a pipeline.
type PipelineVersion struct {
	PipelineVersionID string          `json:"pipeline_version_id"`
	PipelineID        string          `json:"pipeline_id"`
	DisplayName       string          `json:"display_name"`
	Description       string          `json:"description,omitempty"`
	CreatedAt         string          `json:"created_at,omitempty"`
	PipelineSpec      json.RawMessage `json:"pipeline_spec,omitempty"`
}

// PipelinesResponse wraps a list of pipelines.
type PipelinesResponse struct {
	Pipelines     []Pipeline `json:"pipelines,omitempty"`
	TotalSize     int32      `json:"total_size,omitempty"`
	NextPageToken string     `json:"next_page_token,omitempty"`
}

// PipelineVersionsResponse wraps a list of pipeline versions.
type PipelineVersionsResponse struct {
	PipelineVersions []PipelineVersion `json:"pipeline_versions,omitempty"`
	TotalSize        int32             `json:"total_size,omitempty"`
	NextPageToken    string            `json:"next_page_token,omitempty"`
}

// ListRunsParams contains parameters for listing pipeline runs.
type ListRunsParams struct {
	PageSize  int32
	PageToken string
	SortBy    string
	Filter    string
}

// DiscoveredPipeline holds the result of pipeline discovery by name.
type DiscoveredPipeline struct {
	PipelineID        string
	PipelineVersionID string
	PipelineName      string
	Namespace         string
	AllVersionIDs     []string
	DiscoveredAt      time.Time
}

// PipelineDefinition describes a managed pipeline for discovery and auto-creation.
type PipelineDefinition struct {
	Name        string // Exact pipeline display name
	Version     string // Release version suffix (e.g. "3.4.0")
	FileContent []byte // YAML content for auto-creation (required for EnsurePipeline)
}

// PaginatedRuns holds a page of sorted pipeline runs with the total count.
type PaginatedRuns struct {
	Runs      []PipelineRun
	TotalSize int32
}

// DiscoveredDSPA holds the resolved state of a ready DSPipelineApplication instance.
// It is returned by DiscoverReadyDSPA and includes both the pipeline API URL and
// the object storage configuration needed for S3 credential extraction.
type DiscoveredDSPA struct {
	Name          string
	Namespace     string
	APIServerURL  string
	ObjectStorage *DSPAObjectStorageSpec // nil if the DSPA has no object storage configured
}

// DSPAObjectStorageSpec is the resolved object-storage configuration from a DSPA CRD spec.
// Consumers (automl/autorag) use this to locate and fetch S3 credentials from Kubernetes,
// then build an s3.S3ConnectionOptions value from the extracted credentials.
//
// This is DSPA CRD schema knowledge, not S3 domain knowledge. The fields describe
// where to find credentials, not the credentials themselves.
type DSPAObjectStorageSpec struct {
	SecretName     string // K8s Secret holding credentials
	AccessKeyField string // key within SecretName for the access key ID
	SecretKeyField string // key within SecretName for the secret access key
	EndpointURL    string // fully qualified S3-compatible endpoint URL
	Bucket         string // default bucket from the DSPA spec
	Region         string // S3-compatible region (defaults to "us-east-1" if empty)
}
