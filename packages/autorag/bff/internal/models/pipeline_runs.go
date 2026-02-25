package models

// PipelineRun represents a Kubeflow Pipeline Run from the v2beta1 API
// This is the stable public API format exposed to the frontend
type PipelineRun struct {
	RunID             string            `json:"run_id"`
	DisplayName       string            `json:"display_name"`
	Description       string            `json:"description,omitempty"`
	PipelineVersionID string            `json:"pipeline_version_id,omitempty"`
	State             string            `json:"state"`
	CreatedAt         string            `json:"created_at"`
	FinishedAt        string            `json:"finished_at,omitempty"`
	Annotations       map[string]string `json:"annotations,omitempty"`
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

// CreateAutoRAGRunRequest is the BFF-level input for creating an AutoRAG pipeline run.
// The BFF maps these fields to KFP runtime config parameters.
type CreateAutoRAGRunRequest struct {
	DisplayName          string   `json:"display_name"`
	Description          string   `json:"description,omitempty"`
	TestDataSecretName   string   `json:"test_data_secret_name"`
	TestDataBucketName   string   `json:"test_data_bucket_name"`
	TestDataKey          string   `json:"test_data_key"`
	InputDataSecretName  string   `json:"input_data_secret_name"`
	InputDataBucketName  string   `json:"input_data_bucket_name"`
	InputDataKey         string   `json:"input_data_key"`
	LlamaStackSecretName string   `json:"llama_stack_secret_name"`
	EmbeddingsModels     []string `json:"embeddings_models,omitempty"`
	GenerationModels     []string `json:"generation_models,omitempty"`
	OptimizationMetric   string   `json:"optimization_metric,omitempty"`
	VectorDatabaseID     string   `json:"vector_database_id,omitempty"`
}

// PipelineVersionReference identifies the pipeline to run.
type PipelineVersionReference struct {
	PipelineID string `json:"pipeline_id"`
}

// CreatePipelineRunKFRequest is the payload sent to the KFP v2beta1 POST /runs endpoint.
type CreatePipelineRunKFRequest struct {
	DisplayName              string                   `json:"display_name"`
	Description              string                   `json:"description,omitempty"`
	PipelineVersionReference PipelineVersionReference `json:"pipeline_version_reference"`
	RuntimeConfig            RuntimeConfig            `json:"runtime_config"`
}
