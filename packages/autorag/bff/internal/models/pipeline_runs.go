package models

// PipelineRun represents a Kubeflow Pipeline Run from the v2beta1 API
// This is the stable public API format exposed to the frontend
type PipelineRun struct {
	RunID                    string                    `json:"run_id"`
	DisplayName              string                    `json:"display_name"`
	Description              string                    `json:"description,omitempty"`
	ExperimentID             string                    `json:"experiment_id,omitempty"`
	PipelineVersionReference *PipelineVersionReference `json:"pipeline_version_reference,omitempty"`
	State                    string                    `json:"state"`
	StorageState             string                    `json:"storage_state,omitempty"`
	ServiceAccount           string                    `json:"service_account,omitempty"`
	CreatedAt                string                    `json:"created_at"`
	ScheduledAt              string                    `json:"scheduled_at,omitempty"`
	FinishedAt               string                    `json:"finished_at,omitempty"`
	StateHistory             []RuntimeStatus           `json:"state_history,omitempty"`
	Error                    *ErrorInfo                `json:"error,omitempty"`
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
	StateHistory             []RuntimeStatus           `json:"state_history,omitempty"`
	Error                    *ErrorInfo                `json:"error,omitempty"`
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
