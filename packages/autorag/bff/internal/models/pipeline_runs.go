package models

// PipelineRun represents a Kubeflow Pipeline Run from the v2beta1 API
// This is the stable public API format exposed to the frontend
type PipelineRun struct {
	RunID             string `json:"run_id"`
	DisplayName       string `json:"display_name"`
	Description       string `json:"description,omitempty"`
	PipelineVersionID string `json:"pipeline_version_id,omitempty"`
	State             string `json:"state"`
	CreatedAt         string `json:"created_at"`
	FinishedAt        string `json:"finished_at,omitempty"`
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
	RunID             string          `json:"run_id"`
	DisplayName       string          `json:"display_name"`
	Description       string          `json:"description,omitempty"`
	PipelineVersionID string          `json:"pipeline_version_id,omitempty"`
	RuntimeConfig     *RuntimeConfig  `json:"runtime_config,omitempty"`
	ServiceAccount    string          `json:"service_account,omitempty"`
	State             string          `json:"state,omitempty"`
	CreatedAt         string          `json:"created_at,omitempty"`
	ScheduledAt       string          `json:"scheduled_at,omitempty"`
	FinishedAt        string          `json:"finished_at,omitempty"`
	StateHistory      []RuntimeStatus `json:"state_history,omitempty"`
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
