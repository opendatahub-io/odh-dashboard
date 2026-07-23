package repositories

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"testing"

	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	pipelines "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
)

// --- Mock pipelines.Service ---

type mockPipelinesService struct {
	discoverNamedPipelinesFn func(ctx context.Context, namespace, defaultVersion string, definitions map[string]string) (map[string]*pipelines.DiscoveredPipeline, error)
	ensurePipelineFn         func(ctx context.Context, namespace string, def pipelines.PipelineDefinition) (*pipelines.DiscoveredPipeline, error)
	getAllPipelineRunsFn     func(ctx context.Context, namespace, pipelineID string) ([]pipelines.PipelineRun, error)
	getPipelineRunWithSpecFn func(ctx context.Context, namespace, runID string) (*pipelines.PipelineRun, error)
	createPipelineRunFn      func(ctx context.Context, namespace string, input *pipelines.CreatePipelineRunInput) (*pipelines.PipelineRun, error)
	terminateRunFn           func(ctx context.Context, namespace, runID string) error
	retryRunFn               func(ctx context.Context, namespace, runID string) error
	deleteRunFn              func(ctx context.Context, namespace, runID string) error
}

func (m *mockPipelinesService) DiscoverNamedPipelines(ctx context.Context, namespace, defaultVersion string, definitions map[string]string) (map[string]*pipelines.DiscoveredPipeline, error) {
	return m.discoverNamedPipelinesFn(ctx, namespace, defaultVersion, definitions)
}
func (m *mockPipelinesService) EnsurePipeline(ctx context.Context, namespace string, def pipelines.PipelineDefinition) (*pipelines.DiscoveredPipeline, error) {
	return m.ensurePipelineFn(ctx, namespace, def)
}
func (m *mockPipelinesService) GetAllPipelineRuns(ctx context.Context, namespace, pipelineID string) ([]pipelines.PipelineRun, error) {
	return m.getAllPipelineRunsFn(ctx, namespace, pipelineID)
}
func (m *mockPipelinesService) GetPipelineRunWithSpec(ctx context.Context, namespace, runID string) (*pipelines.PipelineRun, error) {
	return m.getPipelineRunWithSpecFn(ctx, namespace, runID)
}
func (m *mockPipelinesService) CreatePipelineRun(ctx context.Context, namespace string, input *pipelines.CreatePipelineRunInput) (*pipelines.PipelineRun, error) {
	return m.createPipelineRunFn(ctx, namespace, input)
}
func (m *mockPipelinesService) TerminateRun(ctx context.Context, namespace, runID string) error {
	return m.terminateRunFn(ctx, namespace, runID)
}
func (m *mockPipelinesService) RetryRun(ctx context.Context, namespace, runID string) error {
	return m.retryRunFn(ctx, namespace, runID)
}
func (m *mockPipelinesService) DeleteRun(ctx context.Context, namespace, runID string) error {
	return m.deleteRunFn(ctx, namespace, runID)
}

// Unused interface methods — stub to satisfy pipelines.Service
func (m *mockPipelinesService) GetPipelineRun(context.Context, string, string) (*pipelines.PipelineRun, error) {
	return nil, nil
}
func (m *mockPipelinesService) ListPipelineRuns(context.Context, string, *pipelines.ListRunsParams) (*pipelines.PipelineRunResponse, error) {
	return nil, nil
}
func (m *mockPipelinesService) ListPipelines(context.Context, string, string) (*pipelines.PipelinesResponse, error) {
	return nil, nil
}
func (m *mockPipelinesService) GetPipelineVersion(context.Context, string, string, string) (*pipelines.PipelineVersion, error) {
	return nil, nil
}
func (m *mockPipelinesService) ListPipelineVersions(context.Context, string, string) (*pipelines.PipelineVersionsResponse, error) {
	return nil, nil
}
func (m *mockPipelinesService) CreatePipeline(context.Context, string, string) (*pipelines.Pipeline, error) {
	return nil, nil
}
func (m *mockPipelinesService) UploadPipelineVersion(context.Context, string, string, string, []byte) (*pipelines.PipelineVersion, error) {
	return nil, nil
}
func (m *mockPipelinesService) DiscoverPipelineByName(context.Context, string, string, string) (*pipelines.DiscoveredPipeline, error) {
	return nil, nil
}
func (m *mockPipelinesService) DiscoverReadyDSPA(context.Context, string) (*pipelines.DiscoveredDSPA, error) {
	return nil, nil
}
func (m *mockPipelinesService) EnableManagedPipelines(context.Context, string) (*pipelines.EnableManagedPipelinesResult, error) {
	return nil, nil
}

// --- Test helpers ---

func ptr[T any](v T) *T { return &v }

func testDiscovered() map[string]*pipelines.DiscoveredPipeline {
	return map[string]*pipelines.DiscoveredPipeline{
		constants.PipelineTypeTabular:    {PipelineID: "tab-pid", PipelineVersionID: "tab-vid", PipelineName: "tabular-pipe"},
		constants.PipelineTypeTimeSeries: {PipelineID: "ts-pid", PipelineVersionID: "ts-vid", PipelineName: "ts-pipe"},
	}
}

func validTabularRequest() models.CreateAutoMLRunRequest {
	return models.CreateAutoMLRunRequest{
		DisplayName:         "my-run",
		TrainDataSecretName: "secret",
		TrainDataBucketName: "bucket",
		TrainDataFileKey:    "data.csv",
		LabelColumn:         ptr("target"),
		TaskType:            ptr("binary"),
	}
}

func validTimeSeriesRequest() models.CreateAutoMLRunRequest {
	return models.CreateAutoMLRunRequest{
		DisplayName:         "ts-run",
		TrainDataSecretName: "secret",
		TrainDataBucketName: "bucket",
		TrainDataFileKey:    "data.csv",
		TaskType:            ptr("timeseries"),
		Target:              ptr("sales"),
		IDColumn:            ptr("store_id"),
		TimestampColumn:     ptr("date"),
	}
}

// === Pure Function Tests ===

func TestDeterminePipelineType(t *testing.T) {
	tests := []struct {
		taskType string
		want     string
		wantErr  bool
	}{
		{"binary", constants.PipelineTypeTabular, false},
		{"multiclass", constants.PipelineTypeTabular, false},
		{"regression", constants.PipelineTypeTabular, false},
		{"timeseries", constants.PipelineTypeTimeSeries, false},
		{"invalid", "", true},
		{"", "", true},
	}
	for _, tt := range tests {
		t.Run(tt.taskType, func(t *testing.T) {
			got, err := DeterminePipelineType(tt.taskType)
			if (err != nil) != tt.wantErr {
				t.Errorf("error = %v, wantErr %v", err, tt.wantErr)
			}
			if got != tt.want {
				t.Errorf("got %q, want %q", got, tt.want)
			}
			if tt.wantErr {
				var ve *ValidationError
				if !errors.As(err, &ve) {
					t.Errorf("expected *ValidationError, got %T", err)
				}
			}
		})
	}
}

func TestValidateCreateAutoMLRunRequest(t *testing.T) {
	t.Run("valid tabular", func(t *testing.T) {
		err := ValidateCreateAutoMLRunRequest(validTabularRequest(), constants.PipelineTypeTabular)
		if err != nil {
			t.Fatal(err)
		}
	})

	t.Run("valid timeseries", func(t *testing.T) {
		err := ValidateCreateAutoMLRunRequest(validTimeSeriesRequest(), constants.PipelineTypeTimeSeries)
		if err != nil {
			t.Fatal(err)
		}
	})

	t.Run("missing common required fields", func(t *testing.T) {
		err := ValidateCreateAutoMLRunRequest(models.CreateAutoMLRunRequest{
			TaskType:    ptr("binary"),
			LabelColumn: ptr("col"),
		}, constants.PipelineTypeTabular)
		if err == nil {
			t.Fatal("expected error")
		}
		if !strings.Contains(err.Error(), "display_name") {
			t.Errorf("error should mention display_name: %v", err)
		}
		if !strings.Contains(err.Error(), "train_data_secret_name") {
			t.Errorf("error should mention train_data_secret_name: %v", err)
		}
	})

	t.Run("missing tabular-specific required fields", func(t *testing.T) {
		req := validTabularRequest()
		req.LabelColumn = nil
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTabular)
		if err == nil {
			t.Fatal("expected error")
		}
		if !strings.Contains(err.Error(), "label_column") {
			t.Errorf("error should mention label_column: %v", err)
		}
	})

	t.Run("missing timeseries-specific required fields", func(t *testing.T) {
		req := validTimeSeriesRequest()
		req.Target = nil
		req.IDColumn = nil
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTimeSeries)
		if err == nil {
			t.Fatal("expected error")
		}
		if !strings.Contains(err.Error(), "target") || !strings.Contains(err.Error(), "id_column") {
			t.Errorf("error should mention target and id_column: %v", err)
		}
	})

	t.Run("unexpected fields for pipeline type", func(t *testing.T) {
		req := validTabularRequest()
		req.Target = ptr("sales")
		req.IDColumn = ptr("store")
		req.TimestampColumn = ptr("date")
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTabular)
		if err == nil {
			t.Fatal("expected error for unexpected timeseries fields on tabular")
		}
		if !strings.Contains(err.Error(), "unexpected fields") {
			t.Errorf("error should mention unexpected fields: %v", err)
		}
	})

	t.Run("invalid task_type for tabular", func(t *testing.T) {
		req := validTabularRequest()
		req.TaskType = ptr("timeseries")
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTabular)
		if err == nil {
			t.Fatal("expected error")
		}
	})

	t.Run("invalid task_type for timeseries", func(t *testing.T) {
		req := validTimeSeriesRequest()
		req.TaskType = ptr("binary")
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTimeSeries)
		if err == nil {
			t.Fatal("expected error")
		}
	})

	t.Run("top_n below minimum", func(t *testing.T) {
		req := validTabularRequest()
		req.TopN = ptr(0)
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTabular)
		if err == nil {
			t.Fatal("expected error")
		}
		if !strings.Contains(err.Error(), "top_n") {
			t.Errorf("error should mention top_n: %v", err)
		}
	})

	t.Run("top_n above tabular maximum", func(t *testing.T) {
		req := validTabularRequest()
		req.TopN = ptr(constants.MaxTopNTabular + 1)
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTabular)
		if err == nil {
			t.Fatal("expected error")
		}
	})

	t.Run("top_n above timeseries maximum", func(t *testing.T) {
		req := validTimeSeriesRequest()
		req.TopN = ptr(constants.MaxTopNTimeSeries + 1)
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTimeSeries)
		if err == nil {
			t.Fatal("expected error")
		}
	})

	t.Run("top_n valid at maximum", func(t *testing.T) {
		req := validTabularRequest()
		req.TopN = ptr(constants.MaxTopNTabular)
		if err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTabular); err != nil {
			t.Fatal(err)
		}
	})

	t.Run("prediction_length must be positive", func(t *testing.T) {
		req := validTimeSeriesRequest()
		req.PredictionLength = ptr(0)
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTimeSeries)
		if err == nil {
			t.Fatal("expected error")
		}
		if !strings.Contains(err.Error(), "prediction_length") {
			t.Errorf("error should mention prediction_length: %v", err)
		}
	})

	t.Run("display_name too long", func(t *testing.T) {
		req := validTabularRequest()
		req.DisplayName = strings.Repeat("x", 251)
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTabular)
		if err == nil {
			t.Fatal("expected error")
		}
	})

	t.Run("unsupported pipeline type", func(t *testing.T) {
		err := ValidateCreateAutoMLRunRequest(validTabularRequest(), "unknown")
		if err == nil {
			t.Fatal("expected error")
		}
	})

	t.Run("nil eval_metric allowed", func(t *testing.T) {
		req := validTabularRequest()
		req.EvalMetric = nil
		if err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTabular); err != nil {
			t.Fatal(err)
		}
	})

	t.Run("valid eval_metric for binary classification", func(t *testing.T) {
		req := validTabularRequest()
		req.TaskType = ptr("binary")
		req.EvalMetric = ptr("f1")
		if err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTabular); err != nil {
			t.Fatal(err)
		}
	})

	t.Run("valid eval_metric for multiclass classification", func(t *testing.T) {
		req := validTabularRequest()
		req.TaskType = ptr("multiclass")
		req.EvalMetric = ptr("roc_auc_ovo")
		if err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTabular); err != nil {
			t.Fatal(err)
		}
	})

	t.Run("valid eval_metric for regression", func(t *testing.T) {
		req := validTabularRequest()
		req.TaskType = ptr("regression")
		req.LabelColumn = ptr("price")
		req.EvalMetric = ptr("r2")
		if err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTabular); err != nil {
			t.Fatal(err)
		}
	})

	t.Run("valid eval_metric for timeseries", func(t *testing.T) {
		req := validTimeSeriesRequest()
		req.EvalMetric = ptr("MASE")
		if err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTimeSeries); err != nil {
			t.Fatal(err)
		}
	})

	t.Run("reject regression eval_metric for binary", func(t *testing.T) {
		req := validTabularRequest()
		req.TaskType = ptr("binary")
		req.EvalMetric = ptr("r2")
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTabular)
		if err == nil {
			t.Fatal("expected error")
		}
		if !strings.Contains(err.Error(), "invalid eval_metric") {
			t.Errorf("error should mention invalid eval_metric: %v", err)
		}
	})

	t.Run("reject classification eval_metric for regression", func(t *testing.T) {
		req := validTabularRequest()
		req.TaskType = ptr("regression")
		req.LabelColumn = ptr("price")
		req.EvalMetric = ptr("accuracy")
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTabular)
		if err == nil {
			t.Fatal("expected error")
		}
		if !strings.Contains(err.Error(), "invalid eval_metric") {
			t.Errorf("error should mention invalid eval_metric: %v", err)
		}
	})

	t.Run("reject tabular eval_metric for timeseries", func(t *testing.T) {
		req := validTimeSeriesRequest()
		req.EvalMetric = ptr("accuracy")
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTimeSeries)
		if err == nil {
			t.Fatal("expected error")
		}
		if !strings.Contains(err.Error(), "invalid eval_metric") {
			t.Errorf("error should mention invalid eval_metric: %v", err)
		}
	})

	t.Run("reject timeseries eval_metric for tabular", func(t *testing.T) {
		req := validTabularRequest()
		req.EvalMetric = ptr("MASE")
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTabular)
		if err == nil {
			t.Fatal("expected error")
		}
		if !strings.Contains(err.Error(), "invalid eval_metric") {
			t.Errorf("error should mention invalid eval_metric: %v", err)
		}
	})
}

func TestBuildPipelineRunInput(t *testing.T) {
	t.Run("tabular with defaults", func(t *testing.T) {
		req := validTabularRequest()
		kfp := BuildPipelineRunInput(req, "pid", "vid", constants.PipelineTypeTabular)

		if kfp.DisplayName != "my-run" {
			t.Errorf("DisplayName = %q", kfp.DisplayName)
		}
		if kfp.PipelineVersionReference.PipelineID != "pid" {
			t.Errorf("PipelineID = %q", kfp.PipelineVersionReference.PipelineID)
		}

		params := kfp.RuntimeConfig.Parameters
		if params["label_column"] != "target" {
			t.Errorf("label_column = %v", params["label_column"])
		}
		if params["task_type"] != "binary" {
			t.Errorf("task_type = %v", params["task_type"])
		}
		if params["top_n"] != constants.DefaultTopN {
			t.Errorf("top_n = %v, want default %d", params["top_n"], constants.DefaultTopN)
		}
		if params["train_data_secret_name"] != "secret" {
			t.Errorf("train_data_secret_name = %v", params["train_data_secret_name"])
		}
	})

	t.Run("tabular with custom top_n", func(t *testing.T) {
		req := validTabularRequest()
		req.TopN = ptr(5)
		kfp := BuildPipelineRunInput(req, "pid", "vid", constants.PipelineTypeTabular)

		if kfp.RuntimeConfig.Parameters["top_n"] != 5 {
			t.Errorf("top_n = %v, want 5", kfp.RuntimeConfig.Parameters["top_n"])
		}
	})

	t.Run("timeseries with defaults", func(t *testing.T) {
		req := validTimeSeriesRequest()
		kfp := BuildPipelineRunInput(req, "pid", "vid", constants.PipelineTypeTimeSeries)

		params := kfp.RuntimeConfig.Parameters
		if params["target"] != "sales" {
			t.Errorf("target = %v", params["target"])
		}
		if params["id_column"] != "store_id" {
			t.Errorf("id_column = %v", params["id_column"])
		}
		if params["timestamp_column"] != "date" {
			t.Errorf("timestamp_column = %v", params["timestamp_column"])
		}
		if params["prediction_length"] != 1 {
			t.Errorf("prediction_length = %v, want default 1", params["prediction_length"])
		}
	})

	t.Run("includes eval_metric when provided", func(t *testing.T) {
		req := validTabularRequest()
		req.EvalMetric = ptr("f1")
		kfp := BuildPipelineRunInput(req, "pid", "vid", constants.PipelineTypeTabular)
		if kfp.RuntimeConfig.Parameters["eval_metric"] != "f1" {
			t.Errorf("eval_metric = %v, want f1", kfp.RuntimeConfig.Parameters["eval_metric"])
		}
	})

	t.Run("omits eval_metric when nil", func(t *testing.T) {
		req := validTabularRequest()
		req.EvalMetric = nil
		kfp := BuildPipelineRunInput(req, "pid", "vid", constants.PipelineTypeTabular)
		if _, ok := kfp.RuntimeConfig.Parameters["eval_metric"]; ok {
			t.Error("eval_metric should not be present when nil")
		}
	})

	t.Run("timeseries with optional fields", func(t *testing.T) {
		req := validTimeSeriesRequest()
		req.PredictionLength = ptr(7)
		req.KnownCovariatesNames = &[]string{"promo", "holiday"}
		kfp := BuildPipelineRunInput(req, "pid", "vid", constants.PipelineTypeTimeSeries)

		params := kfp.RuntimeConfig.Parameters
		if params["prediction_length"] != 7 {
			t.Errorf("prediction_length = %v", params["prediction_length"])
		}
		covariates := params["known_covariates_names"].([]string)
		if len(covariates) != 2 || covariates[0] != "promo" {
			t.Errorf("known_covariates_names = %v", covariates)
		}
	})
}

func TestToAutoMLRun(t *testing.T) {
	t.Run("maps all fields", func(t *testing.T) {
		coreRun := &pipelines.PipelineRun{
			RunID:       "r1",
			DisplayName: "test-run",
			Description: "desc",
			State:       "RUNNING",
			CreatedAt:   "2024-01-01T00:00:00Z",
			PipelineVersionReference: &pipelines.PipelineVersionReference{
				PipelineID: "p1", PipelineVersionID: "v1",
			},
			RuntimeConfig: &pipelines.RuntimeConfig{
				Parameters:   map[string]any{"key": "val"},
				PipelineRoot: "s3://bucket/root",
			},
			Error: &pipelines.ErrorInfo{Code: 1, Message: "oops"},
			StateHistory: []pipelines.RuntimeStatus{
				{UpdateTime: "t1", State: "PENDING"},
				{UpdateTime: "t2", State: "RUNNING", Error: &pipelines.ErrorInfo{Code: 2, Message: "warn"}},
			},
			RunDetails: &pipelines.RunDetails{
				TaskDetails: []pipelines.TaskDetail{
					{
						TaskID:      "task1",
						DisplayName: "train",
						State:       "SUCCEEDED",
						Error:       &pipelines.ErrorInfo{Code: 3, Message: "task err"},
						ChildTasks:  []pipelines.ChildTask{{PodName: "pod-1"}},
						StateHistory: []pipelines.RuntimeStatus{
							{UpdateTime: "t3", State: "RUNNING"},
						},
					},
				},
			},
			PipelineSpec: json.RawMessage(`{"dag":{}}`),
		}

		run := toAutoMLRun(coreRun, constants.PipelineTypeTabular)

		if run.RunID != "r1" || run.DisplayName != "test-run" || run.State != "RUNNING" {
			t.Errorf("basic fields: %+v", run)
		}
		if run.PipelineType != constants.PipelineTypeTabular {
			t.Errorf("PipelineType = %q", run.PipelineType)
		}
		if run.PipelineVersionReference == nil || run.PipelineVersionReference.PipelineID != "p1" {
			t.Error("PipelineVersionReference not mapped")
		}
		if run.RuntimeConfig == nil || run.RuntimeConfig.Parameters["key"] != "val" {
			t.Error("RuntimeConfig not mapped")
		}
		if run.Error == nil || run.Error.Message != "oops" {
			t.Error("Error not mapped")
		}
		if len(run.StateHistory) != 2 {
			t.Fatalf("StateHistory len = %d", len(run.StateHistory))
		}
		if run.StateHistory[1].Error == nil || run.StateHistory[1].Error.Message != "warn" {
			t.Error("StateHistory error not mapped")
		}
		if run.RunDetails == nil || len(run.RunDetails.TaskDetails) != 1 {
			t.Fatal("RunDetails not mapped")
		}
		td := run.RunDetails.TaskDetails[0]
		if td.TaskID != "task1" || td.Error == nil || len(td.ChildTasks) != 1 || len(td.StateHistory) != 1 {
			t.Errorf("TaskDetail not fully mapped: %+v", td)
		}
	})

	t.Run("nil optional fields", func(t *testing.T) {
		run := toAutoMLRun(&pipelines.PipelineRun{RunID: "r2"}, "tabular")
		if run.PipelineVersionReference != nil || run.RuntimeConfig != nil || run.Error != nil || run.RunDetails != nil {
			t.Error("nil optional fields should stay nil")
		}
	})
}

func TestNewValidationError(t *testing.T) {
	err := NewValidationError("bad input")
	if err.Error() != "bad input" {
		t.Errorf("Error() = %q", err.Error())
	}
	if !errors.Is(err, ErrValidation) {
		t.Error("should unwrap to ErrValidation")
	}
}

// === Repository Method Tests (mock pipelines.Service) ===

func TestGetManagedRun(t *testing.T) {
	t.Run("owned run returned", func(t *testing.T) {
		mock := &mockPipelinesService{
			getPipelineRunWithSpecFn: func(ctx context.Context, namespace, runID string) (*pipelines.PipelineRun, error) {
				return &pipelines.PipelineRun{
					RunID:                    "r1",
					State:                    "SUCCEEDED",
					PipelineVersionReference: &pipelines.PipelineVersionReference{PipelineID: "tab-pid"},
				}, nil
			},
			discoverNamedPipelinesFn: func(ctx context.Context, namespace, defaultVersion string, definitions map[string]string) (map[string]*pipelines.DiscoveredPipeline, error) {
				return testDiscovered(), nil
			},
		}
		repo := NewPipelinesRepository(slog.Default(), mock, PipelinesRepositoryConfig{
			TimeSeriesPipelineName: "ts", TabularPipelineName: "tab",
		})

		run, err := repo.GetManagedRun(context.Background(), "ns", "r1")
		if err != nil {
			t.Fatal(err)
		}
		if run.PipelineType != constants.PipelineTypeTabular {
			t.Errorf("PipelineType = %q, want tabular", run.PipelineType)
		}
	})

	t.Run("unowned run rejected", func(t *testing.T) {
		mock := &mockPipelinesService{
			getPipelineRunWithSpecFn: func(ctx context.Context, namespace, runID string) (*pipelines.PipelineRun, error) {
				return &pipelines.PipelineRun{
					RunID:                    "r1",
					PipelineVersionReference: &pipelines.PipelineVersionReference{PipelineID: "foreign-pid"},
				}, nil
			},
			discoverNamedPipelinesFn: func(ctx context.Context, namespace, defaultVersion string, definitions map[string]string) (map[string]*pipelines.DiscoveredPipeline, error) {
				return testDiscovered(), nil
			},
		}
		repo := NewPipelinesRepository(slog.Default(), mock, PipelinesRepositoryConfig{
			TimeSeriesPipelineName: "ts", TabularPipelineName: "tab",
		})

		_, err := repo.GetManagedRun(context.Background(), "ns", "r1")
		if !errors.Is(err, ErrPipelineRunNotFound) {
			t.Errorf("expected ErrPipelineRunNotFound for unowned run, got %v", err)
		}
	})

	t.Run("core not found mapped to local error", func(t *testing.T) {
		mock := &mockPipelinesService{
			getPipelineRunWithSpecFn: func(ctx context.Context, namespace, runID string) (*pipelines.PipelineRun, error) {
				return nil, pipelines.ErrPipelineRunNotFound
			},
		}
		repo := NewPipelinesRepository(slog.Default(), mock, PipelinesRepositoryConfig{})

		_, err := repo.GetManagedRun(context.Background(), "ns", "r1")
		if !errors.Is(err, ErrPipelineRunNotFound) {
			t.Errorf("expected local ErrPipelineRunNotFound, got %v", err)
		}
	})

	t.Run("nil version reference rejected", func(t *testing.T) {
		mock := &mockPipelinesService{
			getPipelineRunWithSpecFn: func(ctx context.Context, namespace, runID string) (*pipelines.PipelineRun, error) {
				return &pipelines.PipelineRun{RunID: "r1"}, nil
			},
			discoverNamedPipelinesFn: func(ctx context.Context, namespace, defaultVersion string, definitions map[string]string) (map[string]*pipelines.DiscoveredPipeline, error) {
				return testDiscovered(), nil
			},
		}
		repo := NewPipelinesRepository(slog.Default(), mock, PipelinesRepositoryConfig{
			TimeSeriesPipelineName: "ts", TabularPipelineName: "tab",
		})

		_, err := repo.GetManagedRun(context.Background(), "ns", "r1")
		if !errors.Is(err, ErrPipelineRunNotFound) {
			t.Errorf("expected ErrPipelineRunNotFound for nil version ref, got %v", err)
		}
	})
}

func TestGetCombinedRuns(t *testing.T) {
	t.Run("tags runs with correct pipeline type", func(t *testing.T) {
		mock := &mockPipelinesService{
			discoverNamedPipelinesFn: func(ctx context.Context, namespace, defaultVersion string, definitions map[string]string) (map[string]*pipelines.DiscoveredPipeline, error) {
				return testDiscovered(), nil
			},
			getAllPipelineRunsFn: func(ctx context.Context, namespace, pipelineID string) ([]pipelines.PipelineRun, error) {
				return []pipelines.PipelineRun{
					{RunID: pipelineID + "-r1", CreatedAt: "2024-01-01T00:00:00Z",
						PipelineVersionReference: &pipelines.PipelineVersionReference{PipelineID: pipelineID}},
				}, nil
			},
		}
		repo := NewPipelinesRepository(slog.Default(), mock, PipelinesRepositoryConfig{
			TimeSeriesPipelineName: "ts", TabularPipelineName: "tab",
		})

		data, err := repo.GetCombinedRuns(context.Background(), "ns", 10, 1)
		if err != nil {
			t.Fatal(err)
		}
		if len(data.Runs) != 2 {
			t.Fatalf("expected 2 runs, got %d", len(data.Runs))
		}

		typeCount := map[string]int{}
		for _, r := range data.Runs {
			typeCount[r.PipelineType]++
		}
		if typeCount[constants.PipelineTypeTabular] != 1 || typeCount[constants.PipelineTypeTimeSeries] != 1 {
			t.Errorf("expected 1 of each type, got %v", typeCount)
		}
	})

	t.Run("no discovered pipelines returns managed pipelines not found error", func(t *testing.T) {
		mock := &mockPipelinesService{
			discoverNamedPipelinesFn: func(ctx context.Context, namespace, defaultVersion string, definitions map[string]string) (map[string]*pipelines.DiscoveredPipeline, error) {
				return map[string]*pipelines.DiscoveredPipeline{}, nil
			},
		}
		repo := NewPipelinesRepository(slog.Default(), mock, PipelinesRepositoryConfig{})

		_, err := repo.GetCombinedRuns(context.Background(), "ns", 10, 1)
		if !errors.Is(err, ErrManagedPipelinesNotFound) {
			t.Fatalf("expected ErrManagedPipelinesNotFound, got %v", err)
		}
	})

	t.Run("only one of two required pipelines discovered returns managed pipelines not found error", func(t *testing.T) {
		mock := &mockPipelinesService{
			discoverNamedPipelinesFn: func(ctx context.Context, namespace, defaultVersion string, definitions map[string]string) (map[string]*pipelines.DiscoveredPipeline, error) {
				return map[string]*pipelines.DiscoveredPipeline{
					constants.PipelineTypeTabular: {PipelineID: "pid"},
				}, nil
			},
		}
		repo := NewPipelinesRepository(slog.Default(), mock, PipelinesRepositoryConfig{})

		_, err := repo.GetCombinedRuns(context.Background(), "ns", 10, 1)
		if !errors.Is(err, ErrManagedPipelinesNotFound) {
			t.Fatalf("expected ErrManagedPipelinesNotFound, got %v", err)
		}
	})
}

func TestMutationOwnershipGating(t *testing.T) {
	for _, op := range []struct {
		name string
		call func(repo *PipelinesRepository) error
	}{
		{"terminate", func(r *PipelinesRepository) error { return r.TerminateRun(context.Background(), "ns", "r1") }},
		{"retry", func(r *PipelinesRepository) error { return r.RetryRun(context.Background(), "ns", "r1") }},
		{"delete", func(r *PipelinesRepository) error { return r.DeleteRun(context.Background(), "ns", "r1") }},
	} {
		t.Run(op.name+" blocked for unowned run", func(t *testing.T) {
			mock := &mockPipelinesService{
				getPipelineRunWithSpecFn: func(ctx context.Context, namespace, runID string) (*pipelines.PipelineRun, error) {
					return &pipelines.PipelineRun{
						RunID:                    "r1",
						PipelineVersionReference: &pipelines.PipelineVersionReference{PipelineID: "foreign"},
					}, nil
				},
				discoverNamedPipelinesFn: func(ctx context.Context, namespace, defaultVersion string, definitions map[string]string) (map[string]*pipelines.DiscoveredPipeline, error) {
					return testDiscovered(), nil
				},
			}
			repo := NewPipelinesRepository(slog.Default(), mock, PipelinesRepositoryConfig{
				TimeSeriesPipelineName: "ts", TabularPipelineName: "tab",
			})

			err := op.call(repo)
			if !errors.Is(err, ErrPipelineRunNotFound) {
				t.Errorf("expected ErrPipelineRunNotFound, got %v", err)
			}
		})

		t.Run(op.name+" allowed for owned run", func(t *testing.T) {
			mock := &mockPipelinesService{
				getPipelineRunWithSpecFn: func(ctx context.Context, namespace, runID string) (*pipelines.PipelineRun, error) {
					return &pipelines.PipelineRun{
						RunID:                    "r1",
						State:                    "RUNNING",
						PipelineVersionReference: &pipelines.PipelineVersionReference{PipelineID: "tab-pid"},
					}, nil
				},
				discoverNamedPipelinesFn: func(ctx context.Context, namespace, defaultVersion string, definitions map[string]string) (map[string]*pipelines.DiscoveredPipeline, error) {
					return testDiscovered(), nil
				},
				terminateRunFn: func(ctx context.Context, namespace, runID string) error { return nil },
				retryRunFn:     func(ctx context.Context, namespace, runID string) error { return nil },
				deleteRunFn:    func(ctx context.Context, namespace, runID string) error { return nil },
			}
			repo := NewPipelinesRepository(slog.Default(), mock, PipelinesRepositoryConfig{
				TimeSeriesPipelineName: "ts", TabularPipelineName: "tab",
			})

			if err := op.call(repo); err != nil {
				t.Fatalf("expected success for owned run: %v", err)
			}
		})
	}
}

func TestCreateRun(t *testing.T) {
	t.Run("missing task_type", func(t *testing.T) {
		repo := NewPipelinesRepository(slog.Default(), &mockPipelinesService{}, PipelinesRepositoryConfig{})
		_, err := repo.CreateRun(context.Background(), "ns", models.CreateAutoMLRunRequest{})
		if err == nil || !strings.Contains(err.Error(), "task_type") {
			t.Errorf("expected task_type error, got %v", err)
		}
	})

	t.Run("validation failure", func(t *testing.T) {
		repo := NewPipelinesRepository(slog.Default(), &mockPipelinesService{}, PipelinesRepositoryConfig{})
		_, err := repo.CreateRun(context.Background(), "ns", models.CreateAutoMLRunRequest{
			TaskType: ptr("binary"),
		})
		if err == nil {
			t.Fatal("expected validation error")
		}
		var ve *ValidationError
		if !errors.As(err, &ve) {
			t.Errorf("expected *ValidationError, got %T", err)
		}
	})

	t.Run("success delegates to core", func(t *testing.T) {
		var gotInput *pipelines.CreatePipelineRunInput
		mock := &mockPipelinesService{
			discoverNamedPipelinesFn: func(ctx context.Context, namespace, defaultVersion string, definitions map[string]string) (map[string]*pipelines.DiscoveredPipeline, error) {
				return map[string]*pipelines.DiscoveredPipeline{
					constants.PipelineTypeTabular:    {PipelineID: "p1", PipelineVersionID: "v1"},
					constants.PipelineTypeTimeSeries: {PipelineID: "p2", PipelineVersionID: "v2"},
				}, nil
			},
			createPipelineRunFn: func(ctx context.Context, namespace string, input *pipelines.CreatePipelineRunInput) (*pipelines.PipelineRun, error) {
				gotInput = input
				return &pipelines.PipelineRun{RunID: "new-run", State: "PENDING"}, nil
			},
		}
		repo := NewPipelinesRepository(slog.Default(), mock, PipelinesRepositoryConfig{
			TabularPipelineName: "tabular-pipe",
		})

		run, err := repo.CreateRun(context.Background(), "ns", validTabularRequest())
		if err != nil {
			t.Fatal(err)
		}
		if run.RunID != "new-run" {
			t.Errorf("RunID = %q", run.RunID)
		}
		if gotInput.PipelineVersionReference.PipelineID != "p1" {
			t.Errorf("PipelineID = %q", gotInput.PipelineVersionReference.PipelineID)
		}
		if gotInput.RuntimeConfig.Parameters["label_column"] != "target" {
			t.Error("label_column not forwarded")
		}
	})

	t.Run("discovery failure", func(t *testing.T) {
		mock := &mockPipelinesService{
			discoverNamedPipelinesFn: func(ctx context.Context, namespace, defaultVersion string, definitions map[string]string) (map[string]*pipelines.DiscoveredPipeline, error) {
				return nil, fmt.Errorf("DSPA not found")
			},
		}
		repo := NewPipelinesRepository(slog.Default(), mock, PipelinesRepositoryConfig{
			TabularPipelineName: "tabular-pipe",
		})

		_, err := repo.CreateRun(context.Background(), "ns", validTabularRequest())
		if err == nil {
			t.Fatal("expected error")
		}
	})

	t.Run("managed pipelines not found", func(t *testing.T) {
		mock := &mockPipelinesService{
			discoverNamedPipelinesFn: func(ctx context.Context, namespace, defaultVersion string, definitions map[string]string) (map[string]*pipelines.DiscoveredPipeline, error) {
				return map[string]*pipelines.DiscoveredPipeline{}, nil
			},
		}
		repo := NewPipelinesRepository(slog.Default(), mock, PipelinesRepositoryConfig{
			TabularPipelineName: "tabular-pipe",
		})

		_, err := repo.CreateRun(context.Background(), "ns", validTabularRequest())
		if err == nil {
			t.Fatal("expected error")
		}
		if !strings.Contains(err.Error(), "managed pipelines not found") {
			t.Errorf("expected managed pipelines error, got: %v", err)
		}
	})
}

func TestDiscoverNamedPipelines_PassesCorrectDefinitions(t *testing.T) {
	var gotDefs map[string]string
	mock := &mockPipelinesService{
		discoverNamedPipelinesFn: func(ctx context.Context, namespace, defaultVersion string, definitions map[string]string) (map[string]*pipelines.DiscoveredPipeline, error) {
			gotDefs = definitions
			return map[string]*pipelines.DiscoveredPipeline{}, nil
		},
	}
	repo := NewPipelinesRepository(slog.Default(), mock, PipelinesRepositoryConfig{
		TimeSeriesPipelineName: "my-ts-pipe",
		TabularPipelineName:    "my-tab-pipe",
		DefaultPipelineVersion: "2.0",
	})

	_, err := repo.DiscoverNamedPipelines(context.Background(), "ns")
	if err != nil {
		t.Fatal(err)
	}
	if gotDefs[constants.PipelineTypeTimeSeries] != "my-ts-pipe" {
		t.Errorf("timeseries = %q", gotDefs[constants.PipelineTypeTimeSeries])
	}
	if gotDefs[constants.PipelineTypeTabular] != "my-tab-pipe" {
		t.Errorf("tabular = %q", gotDefs[constants.PipelineTypeTabular])
	}
}

func TestHasAllRequiredAutoMLPipelines(t *testing.T) {
	t.Run("nil map", func(t *testing.T) {
		if HasAllRequiredAutoMLPipelines(nil) {
			t.Error("expected false for nil map")
		}
	})
	t.Run("empty map", func(t *testing.T) {
		if HasAllRequiredAutoMLPipelines(map[string]*pipelines.DiscoveredPipeline{}) {
			t.Error("expected false for empty map")
		}
	})
	t.Run("only tabular", func(t *testing.T) {
		m := map[string]*pipelines.DiscoveredPipeline{constants.PipelineTypeTabular: {PipelineID: "p1"}}
		if HasAllRequiredAutoMLPipelines(m) {
			t.Error("expected false when timeseries is missing")
		}
	})
	t.Run("both present", func(t *testing.T) {
		m := map[string]*pipelines.DiscoveredPipeline{
			constants.PipelineTypeTabular:    {PipelineID: "p1"},
			constants.PipelineTypeTimeSeries: {PipelineID: "p2"},
		}
		if !HasAllRequiredAutoMLPipelines(m) {
			t.Error("expected true when both are present")
		}
	})
}

func TestNewPipelinesRepository_DefaultVersion(t *testing.T) {
	repo := NewPipelinesRepository(slog.Default(), &mockPipelinesService{}, PipelinesRepositoryConfig{})
	if repo.config.DefaultPipelineVersion != constants.DefaultPipelineVersionSuffix {
		t.Errorf("DefaultPipelineVersion = %q, want %q", repo.config.DefaultPipelineVersion, constants.DefaultPipelineVersionSuffix)
	}

	repo2 := NewPipelinesRepository(slog.Default(), &mockPipelinesService{}, PipelinesRepositoryConfig{DefaultPipelineVersion: "custom"})
	if repo2.config.DefaultPipelineVersion != "custom" {
		t.Errorf("should preserve explicit version, got %q", repo2.config.DefaultPipelineVersion)
	}
}
