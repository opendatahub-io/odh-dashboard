package models

import (
	"bytes"
	"encoding/json"
	"fmt"

	plsvc "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
)

// PipelineVersionReference, RuntimeConfig, RuntimeStatus, ErrorInfo, RunDetails,
// TaskDetail, and ChildTask are type aliases for the canonical types in autox-core.
// They carry no automl-specific fields — only PipelineRun itself (which adds
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
// Optional fields: Description, Preset, EvalMetric, TopN, PredictionLength, KnownCovariatesNames
type CreateAutoMLRunRequest struct {
	// Common fields for all pipeline types
	DisplayName         string  `json:"display_name"`
	Description         string  `json:"description,omitempty"`
	TrainDataSecretName string  `json:"train_data_secret_name"`
	TrainDataBucketName string  `json:"train_data_bucket_name"`
	TrainDataFileKey    string  `json:"train_data_file_key"`
	TestDataBucketName  *string `json:"test_data_bucket_name,omitempty"`
	TestDataFileKey     *string `json:"test_data_file_key,omitempty"`
	Preset              *string `json:"preset,omitempty"`
	EvalMetric          *string `json:"eval_metric,omitempty"`
	TopN                *int    `json:"top_n,omitempty"`

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

// UnmarshalJSON preserves omission of optional test-data fields but rejects null,
// which is not a string in the public request contract.
func (r *CreateAutoMLRunRequest) UnmarshalJSON(data []byte) error {
	type requestAlias CreateAutoMLRunRequest
	var decoded requestAlias
	fields := struct {
		*requestAlias
		TestDataBucketName json.RawMessage `json:"test_data_bucket_name"`
		TestDataFileKey    json.RawMessage `json:"test_data_file_key"`
	}{requestAlias: &decoded}
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&fields); err != nil {
		return err
	}
	for _, field := range []struct {
		name   string
		raw    json.RawMessage
		target **string
	}{
		{"test_data_bucket_name", fields.TestDataBucketName, &decoded.TestDataBucketName},
		{"test_data_file_key", fields.TestDataFileKey, &decoded.TestDataFileKey},
	} {
		if len(field.raw) == 0 {
			continue
		}
		if bytes.Equal(bytes.TrimSpace(field.raw), []byte("null")) {
			return fmt.Errorf("%s must be a string, not null", field.name)
		}
		if err := json.Unmarshal(field.raw, field.target); err != nil {
			return fmt.Errorf("%s: %w", field.name, err)
		}
	}
	*r = CreateAutoMLRunRequest(decoded)
	return nil
}
