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
	StateHistory []RuntimeStatus `json:"state_history,omitempty"`
	ChildTasks   []ChildTask     `json:"child_tasks,omitempty"`
	Error        *ErrorInfo      `json:"error,omitempty"`
}

// ChildTask represents a child task reference
type ChildTask struct {
	PodName string `json:"pod_name,omitempty"`
}

// CreateAutoMLRunRequest is the BFF-level input for creating an AutoML pipeline run.
// This struct supports both tabular and timeseries pipeline types.
// Required fields vary based on pipelineType:
//
// Common fields (all pipeline types):
//   - DisplayName, TrainDataSecretName, TrainDataBucketName, TrainDataFileKey
//
// Tabular-specific required fields (pipelineType=tabular):
//   - LabelColumn, TaskType
//
// Timeseries-specific required fields (pipelineType=timeseries):
//   - Target, IDColumn, TimestampColumn
//
// Optional fields: Description, TopN, PredictionLength, KnownCovariatesNames
type CreateAutoMLRunRequest struct {
	// Common fields for all pipeline types
	DisplayName         string `json:"display_name"`
	Description         string `json:"description,omitempty"`
	TrainDataSecretName string `json:"train_data_secret_name"`
	TrainDataBucketName string `json:"train_data_bucket_name"`
	TrainDataFileKey    string `json:"train_data_file_key"`
	TopN                *int   `json:"top_n,omitempty"`

	// Tabular-specific fields
	LabelColumn *string `json:"label_column,omitempty"`
	TaskType    *string `json:"task_type,omitempty"`

	// Timeseries-specific fields
	Target               *string   `json:"target,omitempty"`
	IDColumn             *string   `json:"id_column,omitempty"`
	TimestampColumn      *string   `json:"timestamp_column,omitempty"`
	PredictionLength     *int      `json:"prediction_length,omitempty"`
	KnownCovariatesNames *[]string `json:"known_covariates_names,omitempty"`
}

// CreatePipelineRunKFRequest is the payload sent to the KFP v2beta1 POST /runs endpoint.
type CreatePipelineRunKFRequest struct {
	DisplayName              string                   `json:"display_name"`
	Description              string                   `json:"description,omitempty"`
	PipelineVersionReference PipelineVersionReference `json:"pipeline_version_reference"`
	RuntimeConfig            RuntimeConfig            `json:"runtime_config"`
}

// KFPipeline represents a pipeline definition from the KFP v2beta1 API.
// Used by pipeline discovery to identify managed AutoML pipelines in a namespace.
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
