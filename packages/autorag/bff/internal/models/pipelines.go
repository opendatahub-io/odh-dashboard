package models

import (
	"encoding/json"

	plsvc "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
)

// PipelineVersionReference, RuntimeConfig, RuntimeStatus, ErrorInfo, RunDetails,
// TaskDetail, and ChildTask are type aliases for the canonical types in autox-core.
// They carry no autorag-specific fields — only PipelineRun itself (which adds
// PipelineType) is a genuinely distinct, hand-maintained contract.
type PipelineVersionReference = plsvc.PipelineVersionReference
type RuntimeConfig = plsvc.RuntimeConfig
type RuntimeStatus = plsvc.RuntimeStatus
type ErrorInfo = plsvc.ErrorInfo
type RunDetails = plsvc.RunDetails
type TaskDetail = plsvc.TaskDetail
type ChildTask = plsvc.ChildTask

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

// PipelineRunsData contains a list of pipeline runs with pagination
type PipelineRunsData struct {
	Runs          []PipelineRun `json:"runs"`
	TotalSize     int32         `json:"total_size,omitempty"`
	NextPageToken string        `json:"next_page_token,omitempty"`
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
	Preset                     *string  `json:"preset,omitempty"`
	EmbeddingsModels           []string `json:"embedding_models,omitempty"`
	GenerationModels           []string `json:"generation_models,omitempty"`
	OptimizationMetric         string   `json:"optimization_metric,omitempty"`
	VectorIOProviderID         string   `json:"vector_io_provider_id,omitempty"`
	OptimizationMaxRagPatterns *int     `json:"optimization_max_rag_patterns,omitempty"`
}
