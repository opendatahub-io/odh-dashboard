package repositories

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
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

// Unused — stub to satisfy pipelines.Service
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
func (m *mockPipelinesService) EnableManagedPipelines(_ context.Context, _ string) (*pipelines.EnableManagedPipelinesResult, error) {
	return nil, nil
}

// --- Helpers ---

func ptr[T any](v T) *T { return &v }

func testDiscovered() map[string]*pipelines.DiscoveredPipeline {
	return map[string]*pipelines.DiscoveredPipeline{
		constants.PipelineTypeAutoRAG: {PipelineID: "rag-pid", PipelineVersionID: "rag-vid", PipelineName: "autorag-pipe"},
	}
}

func validRequest() models.CreateAutoRAGRunRequest {
	return models.CreateAutoRAGRunRequest{
		DisplayName:         "my-rag-run",
		TestDataSecretName:  "test-secret",
		TestDataBucketName:  "test-bucket",
		TestDataKey:         "test.jsonl",
		InputDataSecretName: "input-secret",
		InputDataBucketName: "input-bucket",
		InputDataKey:        "docs/",
		OGXSecretName:       "ogx-secret",
	}
}

// === Pure Function Tests ===

func TestValidateCreateAutoRAGRunRequest(t *testing.T) {
	t.Run("valid minimal request", func(t *testing.T) {
		if err := ValidateCreateAutoRAGRunRequest(validRequest()); err != nil {
			t.Fatal(err)
		}
	})

	t.Run("missing required fields", func(t *testing.T) {
		err := ValidateCreateAutoRAGRunRequest(models.CreateAutoRAGRunRequest{})
		if err == nil {
			t.Fatal("expected error")
		}
		for _, field := range []string{"display_name", "test_data_secret_name", "test_data_bucket_name",
			"test_data_key", "input_data_secret_name", "input_data_bucket_name", "input_data_key", "ogx_secret_name"} {
			if !strings.Contains(err.Error(), field) {
				t.Errorf("error should mention %q: %v", field, err)
			}
		}
		var ve *ValidationError
		if !errors.As(err, &ve) {
			t.Errorf("expected *ValidationError, got %T", err)
		}
	})

	t.Run("valid optimization_metric values", func(t *testing.T) {
		for _, metric := range []string{"faithfulness", "answer_correctness", "context_correctness"} {
			req := validRequest()
			req.OptimizationMetric = metric
			if err := ValidateCreateAutoRAGRunRequest(req); err != nil {
				t.Errorf("metric %q should be valid: %v", metric, err)
			}
		}
	})

	t.Run("invalid optimization_metric", func(t *testing.T) {
		req := validRequest()
		req.OptimizationMetric = "invalid_metric"
		err := ValidateCreateAutoRAGRunRequest(req)
		if err == nil {
			t.Fatal("expected error")
		}
		if !strings.Contains(err.Error(), "optimization_metric") {
			t.Errorf("error should mention optimization_metric: %v", err)
		}
	})

	t.Run("optimization_max_rag_patterns below minimum", func(t *testing.T) {
		req := validRequest()
		req.OptimizationMaxRagPatterns = ptr(constants.MinRagPatterns - 1)
		err := ValidateCreateAutoRAGRunRequest(req)
		if err == nil {
			t.Fatal("expected error")
		}
		if !strings.Contains(err.Error(), "optimization_max_rag_patterns") {
			t.Errorf("error should mention field: %v", err)
		}
	})

	t.Run("optimization_max_rag_patterns above maximum", func(t *testing.T) {
		req := validRequest()
		req.OptimizationMaxRagPatterns = ptr(constants.MaxRagPatterns + 1)
		err := ValidateCreateAutoRAGRunRequest(req)
		if err == nil {
			t.Fatal("expected error")
		}
	})

	t.Run("optimization_max_rag_patterns at boundaries", func(t *testing.T) {
		req := validRequest()
		req.OptimizationMaxRagPatterns = ptr(constants.MinRagPatterns)
		if err := ValidateCreateAutoRAGRunRequest(req); err != nil {
			t.Errorf("min should be valid: %v", err)
		}
		req.OptimizationMaxRagPatterns = ptr(constants.MaxRagPatterns)
		if err := ValidateCreateAutoRAGRunRequest(req); err != nil {
			t.Errorf("max should be valid: %v", err)
		}
	})

	t.Run("display_name too long", func(t *testing.T) {
		req := validRequest()
		req.DisplayName = strings.Repeat("x", 251)
		err := ValidateCreateAutoRAGRunRequest(req)
		if err == nil {
			t.Fatal("expected error")
		}
		if !strings.Contains(err.Error(), "display_name") {
			t.Errorf("error should mention display_name: %v", err)
		}
	})

	t.Run("display_name at max length", func(t *testing.T) {
		req := validRequest()
		req.DisplayName = strings.Repeat("x", 250)
		if err := ValidateCreateAutoRAGRunRequest(req); err != nil {
			t.Errorf("250 chars should be valid: %v", err)
		}
	})
}

func TestBuildPipelineRunInput(t *testing.T) {
	t.Run("minimal request with defaults", func(t *testing.T) {
		req := validRequest()
		kfp := BuildPipelineRunInput(req, "pid", "vid")

		if kfp.DisplayName != "my-rag-run" {
			t.Errorf("DisplayName = %q", kfp.DisplayName)
		}
		if kfp.PipelineVersionReference.PipelineID != "pid" {
			t.Errorf("PipelineID = %q", kfp.PipelineVersionReference.PipelineID)
		}

		params := kfp.RuntimeConfig.Parameters
		if params["test_data_secret_name"] != "test-secret" {
			t.Errorf("test_data_secret_name = %v", params["test_data_secret_name"])
		}
		if params["input_data_key"] != "docs/" {
			t.Errorf("input_data_key = %v", params["input_data_key"])
		}
		if params["ogx_secret_name"] != "ogx-secret" {
			t.Errorf("ogx_secret_name = %v", params["ogx_secret_name"])
		}
		if params["optimization_metric"] != constants.DefaultOptimizationMetric {
			t.Errorf("optimization_metric = %v, want default %q", params["optimization_metric"], constants.DefaultOptimizationMetric)
		}
	})

	t.Run("custom optimization_metric", func(t *testing.T) {
		req := validRequest()
		req.OptimizationMetric = "answer_correctness"
		kfp := BuildPipelineRunInput(req, "pid", "vid")
		if kfp.RuntimeConfig.Parameters["optimization_metric"] != "answer_correctness" {
			t.Errorf("metric = %v", kfp.RuntimeConfig.Parameters["optimization_metric"])
		}
	})

	t.Run("with optional fields", func(t *testing.T) {
		req := validRequest()
		req.EmbeddingsModels = []string{"model-a", "model-b"}
		req.GenerationModels = []string{"gen-1"}
		req.VectorIOProviderID = "provider-x"
		req.OptimizationMaxRagPatterns = ptr(10)
		req.Description = "test description"

		kfp := BuildPipelineRunInput(req, "pid", "vid")
		params := kfp.RuntimeConfig.Parameters

		embModels := params["embedding_models"].([]string)
		if len(embModels) != 2 || embModels[0] != "model-a" {
			t.Errorf("embedding_models = %v", params["embedding_models"])
		}
		genModels := params["generation_models"].([]string)
		if len(genModels) != 1 || genModels[0] != "gen-1" {
			t.Errorf("generation_models = %v", params["generation_models"])
		}
		if params["vector_io_provider_id"] != "provider-x" {
			t.Errorf("vector_io_provider_id = %v", params["vector_io_provider_id"])
		}
		if params["optimization_max_rag_patterns"] != 10 {
			t.Errorf("optimization_max_rag_patterns = %v", params["optimization_max_rag_patterns"])
		}
		if kfp.Description != "test description" {
			t.Errorf("Description = %q", kfp.Description)
		}
	})

	t.Run("empty optional fields omitted", func(t *testing.T) {
		req := validRequest()
		kfp := BuildPipelineRunInput(req, "pid", "vid")
		params := kfp.RuntimeConfig.Parameters

		if _, ok := params["embedding_models"]; ok {
			t.Error("empty embedding_models should be omitted")
		}
		if _, ok := params["generation_models"]; ok {
			t.Error("empty generation_models should be omitted")
		}
		if _, ok := params["vector_io_provider_id"]; ok {
			t.Error("empty vector_io_provider_id should be omitted")
		}
		if _, ok := params["optimization_max_rag_patterns"]; ok {
			t.Error("nil optimization_max_rag_patterns should be omitted")
		}
	})
}

func TestToAutoRAGRun(t *testing.T) {
	t.Run("maps all fields with constant pipeline type", func(t *testing.T) {
		coreRun := &pipelines.PipelineRun{
			RunID:       "r1",
			DisplayName: "rag-run",
			State:       "SUCCEEDED",
			CreatedAt:   "2024-01-01T00:00:00Z",
			PipelineVersionReference: &pipelines.PipelineVersionReference{
				PipelineID: "p1", PipelineVersionID: "v1",
			},
			RuntimeConfig: &pipelines.RuntimeConfig{
				Parameters: map[string]any{"key": "val"},
			},
			Error: &pipelines.ErrorInfo{Code: 1, Message: "oops"},
			StateHistory: []pipelines.RuntimeStatus{
				{UpdateTime: "t1", State: "PENDING"},
				{UpdateTime: "t2", State: "RUNNING", Error: &pipelines.ErrorInfo{Code: 2, Message: "warn"}},
			},
			RunDetails: &pipelines.RunDetails{
				TaskDetails: []pipelines.TaskDetail{
					{
						TaskID: "task1", State: "SUCCEEDED",
						Error:      &pipelines.ErrorInfo{Code: 3, Message: "task err"},
						ChildTasks: []pipelines.ChildTask{{PodName: "pod-1"}},
						StateHistory: []pipelines.RuntimeStatus{
							{UpdateTime: "t3", State: "RUNNING"},
						},
					},
				},
			},
			PipelineSpec: json.RawMessage(`{"dag":{}}`),
		}

		run := toAutoRAGRun(coreRun)

		if run.PipelineType != constants.PipelineTypeAutoRAG {
			t.Errorf("PipelineType = %q, want %q", run.PipelineType, constants.PipelineTypeAutoRAG)
		}
		if run.RunID != "r1" || run.DisplayName != "rag-run" || run.State != "SUCCEEDED" {
			t.Errorf("basic fields wrong: %+v", run)
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
		if len(run.StateHistory) != 2 || run.StateHistory[1].Error == nil {
			t.Error("StateHistory not mapped")
		}
		if run.RunDetails == nil || len(run.RunDetails.TaskDetails) != 1 {
			t.Fatal("RunDetails not mapped")
		}
		td := run.RunDetails.TaskDetails[0]
		if td.Error == nil || len(td.ChildTasks) != 1 || len(td.StateHistory) != 1 {
			t.Errorf("TaskDetail incomplete: %+v", td)
		}
	})

	t.Run("nil optional fields", func(t *testing.T) {
		run := toAutoRAGRun(&pipelines.PipelineRun{RunID: "r2"})
		if run.PipelineType != constants.PipelineTypeAutoRAG {
			t.Errorf("PipelineType = %q", run.PipelineType)
		}
		if run.PipelineVersionReference != nil || run.RuntimeConfig != nil || run.Error != nil || run.RunDetails != nil {
			t.Error("nil fields should stay nil")
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

// === Repository Method Tests ===

func TestGetManagedRun(t *testing.T) {
	t.Run("owned run returned", func(t *testing.T) {
		mock := &mockPipelinesService{
			getPipelineRunWithSpecFn: func(ctx context.Context, namespace, runID string) (*pipelines.PipelineRun, error) {
				return &pipelines.PipelineRun{
					RunID: "r1", State: "SUCCEEDED",
					PipelineVersionReference: &pipelines.PipelineVersionReference{PipelineID: "rag-pid"},
				}, nil
			},
			discoverNamedPipelinesFn: func(ctx context.Context, namespace, defaultVersion string, definitions map[string]string) (map[string]*pipelines.DiscoveredPipeline, error) {
				return testDiscovered(), nil
			},
		}
		repo := NewPipelinesRepository(slog.Default(), mock, PipelinesRepositoryConfig{AutoRAGPipelineName: "rag"})

		run, err := repo.GetManagedRun(context.Background(), "ns", "r1")
		if err != nil {
			t.Fatal(err)
		}
		if run.PipelineType != constants.PipelineTypeAutoRAG {
			t.Errorf("PipelineType = %q", run.PipelineType)
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
		repo := NewPipelinesRepository(slog.Default(), mock, PipelinesRepositoryConfig{AutoRAGPipelineName: "rag"})

		_, err := repo.GetManagedRun(context.Background(), "ns", "r1")
		if !errors.Is(err, ErrPipelineRunNotFound) {
			t.Errorf("expected ErrPipelineRunNotFound, got %v", err)
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
		repo := NewPipelinesRepository(slog.Default(), mock, PipelinesRepositoryConfig{AutoRAGPipelineName: "rag"})

		_, err := repo.GetManagedRun(context.Background(), "ns", "r1")
		if !errors.Is(err, ErrPipelineRunNotFound) {
			t.Errorf("expected ErrPipelineRunNotFound, got %v", err)
		}
	})
}

func TestGetCombinedRuns(t *testing.T) {
	t.Run("returns runs with autorag type", func(t *testing.T) {
		mock := &mockPipelinesService{
			discoverNamedPipelinesFn: func(ctx context.Context, namespace, defaultVersion string, definitions map[string]string) (map[string]*pipelines.DiscoveredPipeline, error) {
				return testDiscovered(), nil
			},
			getAllPipelineRunsFn: func(ctx context.Context, namespace, pipelineID string) ([]pipelines.PipelineRun, error) {
				return []pipelines.PipelineRun{
					{RunID: "r1", CreatedAt: "2024-01-02T00:00:00Z",
						PipelineVersionReference: &pipelines.PipelineVersionReference{PipelineID: "rag-pid"}},
					{RunID: "r2", CreatedAt: "2024-01-01T00:00:00Z",
						PipelineVersionReference: &pipelines.PipelineVersionReference{PipelineID: "rag-pid"}},
				}, nil
			},
		}
		repo := NewPipelinesRepository(slog.Default(), mock, PipelinesRepositoryConfig{AutoRAGPipelineName: "rag"})

		data, err := repo.GetCombinedRuns(context.Background(), "ns", 10, 1)
		if err != nil {
			t.Fatal(err)
		}
		if len(data.Runs) != 2 {
			t.Fatalf("expected 2 runs, got %d", len(data.Runs))
		}
		for _, r := range data.Runs {
			if r.PipelineType != constants.PipelineTypeAutoRAG {
				t.Errorf("PipelineType = %q, want autorag", r.PipelineType)
			}
		}
	})

	t.Run("no discovered pipeline returns managed pipelines not found error", func(t *testing.T) {
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

	t.Run("nil pipeline entry returns managed pipelines not found error", func(t *testing.T) {
		mock := &mockPipelinesService{
			discoverNamedPipelinesFn: func(ctx context.Context, namespace, defaultVersion string, definitions map[string]string) (map[string]*pipelines.DiscoveredPipeline, error) {
				return map[string]*pipelines.DiscoveredPipeline{
					constants.PipelineTypeAutoRAG: nil,
				}, nil
			},
		}
		repo := NewPipelinesRepository(slog.Default(), mock, PipelinesRepositoryConfig{})

		_, err := repo.GetCombinedRuns(context.Background(), "ns", 10, 1)
		if !errors.Is(err, ErrManagedPipelinesNotFound) {
			t.Fatalf("expected ErrManagedPipelinesNotFound, got %v", err)
		}
	})

	t.Run("page-based pagination returns correct slices", func(t *testing.T) {
		mock := &mockPipelinesService{
			discoverNamedPipelinesFn: func(ctx context.Context, namespace, defaultVersion string, definitions map[string]string) (map[string]*pipelines.DiscoveredPipeline, error) {
				return testDiscovered(), nil
			},
			getAllPipelineRunsFn: func(ctx context.Context, namespace, pipelineID string) ([]pipelines.PipelineRun, error) {
				return []pipelines.PipelineRun{
					{RunID: "r1", CreatedAt: "2024-01-03T00:00:00Z",
						PipelineVersionReference: &pipelines.PipelineVersionReference{PipelineID: "rag-pid"}},
					{RunID: "r2", CreatedAt: "2024-01-02T00:00:00Z",
						PipelineVersionReference: &pipelines.PipelineVersionReference{PipelineID: "rag-pid"}},
					{RunID: "r3", CreatedAt: "2024-01-01T00:00:00Z",
						PipelineVersionReference: &pipelines.PipelineVersionReference{PipelineID: "rag-pid"}},
				}, nil
			},
		}
		repo := NewPipelinesRepository(slog.Default(), mock, PipelinesRepositoryConfig{AutoRAGPipelineName: "rag"})

		// Page 1: should return 2 runs out of 3 total
		page1, err := repo.GetCombinedRuns(context.Background(), "ns", 2, 1)
		if err != nil {
			t.Fatal(err)
		}
		if len(page1.Runs) != 2 {
			t.Fatalf("page 1: expected 2 runs, got %d", len(page1.Runs))
		}
		if page1.TotalSize != 3 {
			t.Errorf("page 1: expected TotalSize 3, got %d", page1.TotalSize)
		}

		// Page 2: should return the remaining 1 run
		page2, err := repo.GetCombinedRuns(context.Background(), "ns", 2, 2)
		if err != nil {
			t.Fatal(err)
		}
		if len(page2.Runs) != 1 {
			t.Fatalf("page 2: expected 1 run, got %d", len(page2.Runs))
		}
		if page2.TotalSize != 3 {
			t.Errorf("page 2: expected TotalSize 3, got %d", page2.TotalSize)
		}

		// Verify no overlap between pages
		page1IDs := make(map[string]bool)
		for _, r := range page1.Runs {
			page1IDs[r.RunID] = true
		}
		for _, r := range page2.Runs {
			if page1IDs[r.RunID] {
				t.Errorf("run %q appears on both page 1 and page 2", r.RunID)
			}
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
			repo := NewPipelinesRepository(slog.Default(), mock, PipelinesRepositoryConfig{AutoRAGPipelineName: "rag"})

			err := op.call(repo)
			if !errors.Is(err, ErrPipelineRunNotFound) {
				t.Errorf("expected ErrPipelineRunNotFound, got %v", err)
			}
		})

		t.Run(op.name+" allowed for owned run", func(t *testing.T) {
			mock := &mockPipelinesService{
				getPipelineRunWithSpecFn: func(ctx context.Context, namespace, runID string) (*pipelines.PipelineRun, error) {
					return &pipelines.PipelineRun{
						RunID: "r1", State: "RUNNING",
						PipelineVersionReference: &pipelines.PipelineVersionReference{PipelineID: "rag-pid"},
					}, nil
				},
				discoverNamedPipelinesFn: func(ctx context.Context, namespace, defaultVersion string, definitions map[string]string) (map[string]*pipelines.DiscoveredPipeline, error) {
					return testDiscovered(), nil
				},
				terminateRunFn: func(ctx context.Context, namespace, runID string) error { return nil },
				retryRunFn:     func(ctx context.Context, namespace, runID string) error { return nil },
				deleteRunFn:    func(ctx context.Context, namespace, runID string) error { return nil },
			}
			repo := NewPipelinesRepository(slog.Default(), mock, PipelinesRepositoryConfig{AutoRAGPipelineName: "rag"})

			if err := op.call(repo); err != nil {
				t.Fatalf("expected success: %v", err)
			}
		})
	}
}

func TestCreateRun(t *testing.T) {
	t.Run("validation failure", func(t *testing.T) {
		repo := NewPipelinesRepository(slog.Default(), &mockPipelinesService{}, PipelinesRepositoryConfig{})
		_, err := repo.CreateRun(context.Background(), "ns", models.CreateAutoRAGRunRequest{})
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
					constants.PipelineTypeAutoRAG: {PipelineID: "p1", PipelineVersionID: "v1"},
				}, nil
			},
			createPipelineRunFn: func(ctx context.Context, namespace string, input *pipelines.CreatePipelineRunInput) (*pipelines.PipelineRun, error) {
				gotInput = input
				return &pipelines.PipelineRun{RunID: "new-run", State: "PENDING"}, nil
			},
		}
		repo := NewPipelinesRepository(slog.Default(), mock, PipelinesRepositoryConfig{AutoRAGPipelineName: "rag-pipe"})

		run, err := repo.CreateRun(context.Background(), "ns", validRequest())
		if err != nil {
			t.Fatal(err)
		}
		if run.RunID != "new-run" {
			t.Errorf("RunID = %q", run.RunID)
		}
		if run.PipelineType != constants.PipelineTypeAutoRAG {
			t.Errorf("PipelineType = %q", run.PipelineType)
		}
		if gotInput.PipelineVersionReference.PipelineID != "p1" {
			t.Error("pipeline ID not forwarded")
		}
		if gotInput.RuntimeConfig.Parameters["ogx_secret_name"] != "ogx-secret" {
			t.Error("ogx_secret_name not forwarded")
		}
		if gotInput.RuntimeConfig.Parameters["optimization_metric"] != constants.DefaultOptimizationMetric {
			t.Error("default optimization_metric not set")
		}
	})

	t.Run("discovery failure", func(t *testing.T) {
		mock := &mockPipelinesService{
			discoverNamedPipelinesFn: func(ctx context.Context, namespace, defaultVersion string, definitions map[string]string) (map[string]*pipelines.DiscoveredPipeline, error) {
				return nil, fmt.Errorf("DSPA not found")
			},
		}
		repo := NewPipelinesRepository(slog.Default(), mock, PipelinesRepositoryConfig{AutoRAGPipelineName: "rag"})

		_, err := repo.CreateRun(context.Background(), "ns", validRequest())
		if err == nil {
			t.Fatal("expected error")
		}
	})

	t.Run("managed pipeline not found", func(t *testing.T) {
		mock := &mockPipelinesService{
			discoverNamedPipelinesFn: func(ctx context.Context, namespace, defaultVersion string, definitions map[string]string) (map[string]*pipelines.DiscoveredPipeline, error) {
				return map[string]*pipelines.DiscoveredPipeline{}, nil
			},
		}
		repo := NewPipelinesRepository(slog.Default(), mock, PipelinesRepositoryConfig{AutoRAGPipelineName: "rag"})

		_, err := repo.CreateRun(context.Background(), "ns", validRequest())
		if err == nil {
			t.Fatal("expected error")
		}
		if !strings.Contains(err.Error(), "managed pipelines not found") {
			t.Errorf("expected managed pipelines error, got: %v", err)
		}
	})
}

func TestDiscoverNamedPipelines_PassesCorrectDefinition(t *testing.T) {
	var gotDefs map[string]string
	var gotVersion string
	mock := &mockPipelinesService{
		discoverNamedPipelinesFn: func(ctx context.Context, namespace, defaultVersion string, definitions map[string]string) (map[string]*pipelines.DiscoveredPipeline, error) {
			gotDefs = definitions
			gotVersion = defaultVersion
			return map[string]*pipelines.DiscoveredPipeline{}, nil
		},
	}
	repo := NewPipelinesRepository(slog.Default(), mock, PipelinesRepositoryConfig{
		AutoRAGPipelineName:    "my-rag-pipe",
		DefaultPipelineVersion: "2.0",
	})

	_, err := repo.DiscoverNamedPipelines(context.Background(), "ns")
	if err != nil {
		t.Fatal(err)
	}
	if gotDefs[constants.PipelineTypeAutoRAG] != "my-rag-pipe" {
		t.Errorf("autorag definition = %q", gotDefs[constants.PipelineTypeAutoRAG])
	}
	if len(gotDefs) != 1 {
		t.Errorf("expected exactly 1 definition, got %d", len(gotDefs))
	}
	if gotVersion != "2.0" {
		t.Errorf("version = %q", gotVersion)
	}
}

func TestNewPipelinesRepository_DefaultVersion(t *testing.T) {
	repo := NewPipelinesRepository(slog.Default(), &mockPipelinesService{}, PipelinesRepositoryConfig{})
	if repo.config.DefaultPipelineVersion != constants.DefaultPipelineVersionSuffix {
		t.Errorf("got %q, want %q", repo.config.DefaultPipelineVersion, constants.DefaultPipelineVersionSuffix)
	}

	repo2 := NewPipelinesRepository(slog.Default(), &mockPipelinesService{}, PipelinesRepositoryConfig{DefaultPipelineVersion: "custom"})
	if repo2.config.DefaultPipelineVersion != "custom" {
		t.Errorf("should preserve explicit version, got %q", repo2.config.DefaultPipelineVersion)
	}
}
