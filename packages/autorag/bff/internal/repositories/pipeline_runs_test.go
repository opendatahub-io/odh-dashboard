package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/pipelineserver/psmocks"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
)

const (
	testPipelineID        = "test-pipeline-id"
	testPipelineVersionID = "test-version-id"
)

func TestPipelineRunsRepository_GetPipelineRuns(t *testing.T) {
	repo := NewPipelineRunsRepository()
	mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")
	ctx := context.Background()

	t.Run("should return empty when pipelineID is empty (no versions to scope)", func(t *testing.T) {
		runsData, err := repo.GetPipelineRuns(mockClient, ctx, "", 20, "", constants.PipelineTypeAutoRAG)

		assert.NoError(t, err)
		assert.NotNil(t, runsData)
		assert.Empty(t, runsData.Runs)
		assert.Equal(t, int32(0), runsData.TotalSize)
	})

	t.Run("should handle pipeline ID filtering across all versions", func(t *testing.T) {
		ids := psmocks.DeriveMockIDs("test-namespace")
		pipelineID := ids.PipelineID

		runsData, err := repo.GetPipelineRuns(mockClient, ctx, pipelineID, 20, "", constants.PipelineTypeAutoRAG)

		assert.NoError(t, err)
		assert.NotNil(t, runsData)
		assert.Len(t, runsData.Runs, 3)

		// Verify the filter was forwarded to the pipeline server
		assert.NotNil(t, mockClient.LastListRunsParams, "GetPipelineRuns should have called ListRuns")
		assert.Contains(t, mockClient.LastListRunsParams.Filter, "pipeline_version_id",
			"filter sent to pipeline server should include pipeline_version_id predicate")

		// Verify every returned run belongs to the requested pipeline
		for _, run := range runsData.Runs {
			if assert.NotNil(t, run.PipelineVersionReference, "run should have a PipelineVersionReference") {
				assert.Equal(t, pipelineID, run.PipelineVersionReference.PipelineID,
					"run %s has unexpected PipelineID", run.RunID)
			}
		}
	})

	t.Run("should handle pagination parameters", func(t *testing.T) {
		ids := psmocks.DeriveMockIDs("test-namespace")
		runsData, err := repo.GetPipelineRuns(mockClient, ctx, ids.PipelineID, 10, "page-token-123", constants.PipelineTypeAutoRAG)

		assert.NoError(t, err)
		assert.NotNil(t, runsData)
	})

	t.Run("should transform Kubeflow format to stable API format", func(t *testing.T) {
		ids := psmocks.DeriveMockIDs("test-namespace")
		runsData, err := repo.GetPipelineRuns(mockClient, ctx, ids.PipelineID, 20, "", constants.PipelineTypeAutoRAG)

		assert.NoError(t, err)
		assert.NotNil(t, runsData)

		if len(runsData.Runs) > 0 {
			run := runsData.Runs[0]
			// Verify required fields are present
			assert.NotEmpty(t, run.RunID)
			assert.NotEmpty(t, run.DisplayName)
			assert.NotEmpty(t, run.State)
			assert.NotEmpty(t, run.CreatedAt)

			// Verify enhanced fields are transformed
			assert.NotEmpty(t, run.ExperimentID)
			assert.NotNil(t, run.PipelineVersionReference)
			if run.PipelineVersionReference != nil {
				assert.NotEmpty(t, run.PipelineVersionReference.PipelineID)
				assert.NotEmpty(t, run.PipelineVersionReference.PipelineVersionID)
			}
			assert.NotEmpty(t, run.StorageState)
			assert.NotEmpty(t, run.ServiceAccount)

			// Verify state history is present
			assert.NotNil(t, run.StateHistory)
			if len(run.StateHistory) > 0 {
				assert.NotEmpty(t, run.StateHistory[0].UpdateTime)
				assert.NotEmpty(t, run.StateHistory[0].State)
			}

			// Verify pipeline_type is set from the pipelineType parameter
			assert.Equal(t, constants.PipelineTypeAutoRAG, run.PipelineType)
		}
	})
}

func TestBuildFilter(t *testing.T) {
	t.Run("should build filter with single version ID", func(t *testing.T) {
		versionID := "v1-version-id-12345"

		filter, err := buildFilter([]string{versionID})
		assert.NoError(t, err)
		assert.NotEmpty(t, filter)
		assert.Contains(t, filter, versionID)
		assert.Contains(t, filter, "pipeline_version_id")
		assert.Contains(t, filter, "IN")
		assert.Contains(t, filter, "predicates")
		assert.Contains(t, filter, "storage_state")
		assert.Contains(t, filter, "AVAILABLE")
	})

	t.Run("should build filter with multiple version IDs", func(t *testing.T) {
		versionIDs := []string{"version-1", "version-2"}

		filter, err := buildFilter(versionIDs)
		assert.NoError(t, err)
		assert.NotEmpty(t, filter)
		assert.Contains(t, filter, "version-1")
		assert.Contains(t, filter, "version-2")
		assert.Contains(t, filter, "pipeline_version_id")
		assert.Contains(t, filter, "IN")
		assert.Contains(t, filter, "storage_state")
		assert.Contains(t, filter, "AVAILABLE")
	})

	t.Run("should always include storage_state filter", func(t *testing.T) {
		filter, err := buildFilter(nil)
		assert.NoError(t, err)
		assert.NotEmpty(t, filter)
		assert.Contains(t, filter, "storage_state")
		assert.Contains(t, filter, "AVAILABLE")
		assert.Contains(t, filter, "predicates")
	})

	t.Run("should format filter as valid JSON", func(t *testing.T) {
		filter, err := buildFilter([]string{"test-version-id"})
		assert.NoError(t, err)
		assert.True(t, json.Valid([]byte(filter)))
		assert.Contains(t, filter, "\"predicates\"")
	})
}

func TestCollectVersionIDs(t *testing.T) {
	ctx := context.Background()

	t.Run("should return nil for empty pipeline ID", func(t *testing.T) {
		mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")
		ids, err := collectVersionIDs(mockClient, ctx, "")
		assert.NoError(t, err)
		assert.Nil(t, ids)
	})

	t.Run("should return cached IDs on cache hit without calling API", func(t *testing.T) {
		cachedPipelineID := "cached-pipeline-id"
		expectedVersionIDs := []string{"cached-v1", "cached-v2"}

		cacheKey := "test-cache:test-ns"
		globalPipelineCache.set(cacheKey, map[string]*DiscoveredPipeline{
			"test": {
				PipelineID:    cachedPipelineID,
				AllVersionIDs: expectedVersionIDs,
			},
		})
		defer globalPipelineCache.invalidate(cacheKey)

		mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")
		ids, err := collectVersionIDs(mockClient, ctx, cachedPipelineID)

		assert.NoError(t, err)
		assert.Equal(t, expectedVersionIDs, ids)

		// Verify returned slice is a defensive copy — mutating it must not affect the cache.
		if len(ids) > 0 {
			ids[0] = "mutated-value"
			cached, err2 := collectVersionIDs(mockClient, ctx, cachedPipelineID)
			assert.NoError(t, err2)
			assert.Equal(t, expectedVersionIDs, cached,
				"cache must be unaffected by mutation of the returned slice")
		}
	})

	t.Run("should fall back to API on cache miss", func(t *testing.T) {
		mockClient := psmocks.NewMockPipelineServerClient("mock://collect-test")
		derivedIDs := psmocks.DeriveMockIDs("collect-test")

		ids, err := collectVersionIDs(mockClient, ctx, derivedIDs.PipelineID)

		assert.NoError(t, err)
		assert.NotNil(t, ids)
		assert.Contains(t, ids, derivedIDs.LatestVersionID)
	})

	t.Run("should return nil for unknown pipeline ID with no versions", func(t *testing.T) {
		mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")
		ids, err := collectVersionIDs(mockClient, ctx, "nonexistent-pipeline-id")

		assert.NoError(t, err)
		assert.Nil(t, ids)
	})

	t.Run("should propagate ListPipelineVersions API errors", func(t *testing.T) {
		mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")
		mockClient.ListPipelineVersionsErr = fmt.Errorf("connection refused")

		ids, err := collectVersionIDs(mockClient, ctx, "any-pipeline-id")

		assert.Nil(t, ids)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to list pipeline versions")
		assert.Contains(t, err.Error(), "connection refused")
	})
}

func newValidCreateRequest() models.CreateAutoRAGRunRequest {
	return models.CreateAutoRAGRunRequest{
		DisplayName:          "test-run",
		TestDataSecretName:   "minio-secret",
		TestDataBucketName:   "autorag",
		TestDataKey:          "test_data.json",
		InputDataSecretName:  "minio-secret",
		InputDataBucketName:  "autorag",
		InputDataKey:         "documents/",
		LlamaStackSecretName: "llama-secret",
	}
}

func TestBuildKFPRunRequest(t *testing.T) {
	t.Run("should map all required parameters correctly", func(t *testing.T) {
		req := newValidCreateRequest()
		result := BuildKFPRunRequest(req, testPipelineID, testPipelineVersionID)

		assert.Equal(t, "test-run", result.DisplayName)
		assert.Equal(t, testPipelineID, result.PipelineVersionReference.PipelineID)
		assert.Equal(t, testPipelineVersionID, result.PipelineVersionReference.PipelineVersionID)

		params := result.RuntimeConfig.Parameters
		assert.Equal(t, "minio-secret", params["test_data_secret_name"])
		assert.Equal(t, "autorag", params["test_data_bucket_name"])
		assert.Equal(t, "test_data.json", params["test_data_key"])
		assert.Equal(t, "minio-secret", params["input_data_secret_name"])
		assert.Equal(t, "autorag", params["input_data_bucket_name"])
		assert.Equal(t, "documents/", params["input_data_key"])
		assert.Equal(t, "llama-secret", params["llama_stack_secret_name"])
	})

	t.Run("should default optimization_metric to faithfulness", func(t *testing.T) {
		req := newValidCreateRequest()
		result := BuildKFPRunRequest(req, testPipelineID, testPipelineVersionID)

		assert.Equal(t, constants.DefaultOptimizationMetric, result.RuntimeConfig.Parameters["optimization_metric"])
	})

	t.Run("should use provided optimization_metric", func(t *testing.T) {
		req := newValidCreateRequest()
		req.OptimizationMetric = "answer_correctness"
		result := BuildKFPRunRequest(req, testPipelineID, testPipelineVersionID)

		assert.Equal(t, "answer_correctness", result.RuntimeConfig.Parameters["optimization_metric"])
	})

	t.Run("should include embeddings_models when provided", func(t *testing.T) {
		req := newValidCreateRequest()
		req.EmbeddingsModels = []string{"model-a", "model-b"}
		result := BuildKFPRunRequest(req, testPipelineID, testPipelineVersionID)

		assert.Equal(t, []string{"model-a", "model-b"}, result.RuntimeConfig.Parameters["embeddings_models"])
	})

	t.Run("should omit embeddings_models when empty", func(t *testing.T) {
		req := newValidCreateRequest()
		result := BuildKFPRunRequest(req, testPipelineID, testPipelineVersionID)

		_, exists := result.RuntimeConfig.Parameters["embeddings_models"]
		assert.False(t, exists)
	})

	t.Run("should include generation_models when provided", func(t *testing.T) {
		req := newValidCreateRequest()
		req.GenerationModels = []string{"gen-1"}
		result := BuildKFPRunRequest(req, testPipelineID, testPipelineVersionID)

		assert.Equal(t, []string{"gen-1"}, result.RuntimeConfig.Parameters["generation_models"])
	})

	t.Run("should omit generation_models when empty", func(t *testing.T) {
		req := newValidCreateRequest()
		result := BuildKFPRunRequest(req, testPipelineID, testPipelineVersionID)

		_, exists := result.RuntimeConfig.Parameters["generation_models"]
		assert.False(t, exists)
	})

	t.Run("should include llama_stack_vector_io_provider_id when provided", func(t *testing.T) {
		req := newValidCreateRequest()
		req.LlamaStackVectorIOProviderID = "milvus-db"
		result := BuildKFPRunRequest(req, testPipelineID, testPipelineVersionID)

		assert.Equal(t, "milvus-db", result.RuntimeConfig.Parameters["llama_stack_vector_io_provider_id"])
	})

	t.Run("should omit llama_stack_vector_io_provider_id when empty", func(t *testing.T) {
		req := newValidCreateRequest()
		result := BuildKFPRunRequest(req, testPipelineID, testPipelineVersionID)

		_, exists := result.RuntimeConfig.Parameters["llama_stack_vector_io_provider_id"]
		assert.False(t, exists)
	})

	t.Run("should include optimization_max_rag_patterns when provided", func(t *testing.T) {
		req := newValidCreateRequest()
		maxPatterns := 12
		req.OptimizationMaxRagPatterns = &maxPatterns
		result := BuildKFPRunRequest(req, testPipelineID, testPipelineVersionID)

		assert.Equal(t, 12, result.RuntimeConfig.Parameters["optimization_max_rag_patterns"])
	})

	t.Run("should omit optimization_max_rag_patterns when nil", func(t *testing.T) {
		req := newValidCreateRequest()
		result := BuildKFPRunRequest(req, testPipelineID, testPipelineVersionID)

		_, exists := result.RuntimeConfig.Parameters["optimization_max_rag_patterns"]
		assert.False(t, exists)
	})

	t.Run("should pass description to KFP request", func(t *testing.T) {
		req := newValidCreateRequest()
		req.Description = "my description"
		result := BuildKFPRunRequest(req, testPipelineID, testPipelineVersionID)

		assert.Equal(t, "my description", result.Description)
	})
}

func TestValidateCreateAutoRAGRunRequest(t *testing.T) {
	t.Run("should pass with all required fields", func(t *testing.T) {
		req := newValidCreateRequest()
		err := ValidateCreateAutoRAGRunRequest(req)
		assert.NoError(t, err)
	})

	t.Run("should fail when display_name is missing", func(t *testing.T) {
		req := newValidCreateRequest()
		req.DisplayName = ""
		err := ValidateCreateAutoRAGRunRequest(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "display_name")
	})

	t.Run("should fail when multiple required fields are missing", func(t *testing.T) {
		req := models.CreateAutoRAGRunRequest{}
		err := ValidateCreateAutoRAGRunRequest(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "display_name")
		assert.Contains(t, err.Error(), "test_data_secret_name")
		assert.Contains(t, err.Error(), "llama_stack_secret_name")
	})

	t.Run("should accept valid optimization_metric values", func(t *testing.T) {
		for _, metric := range []string{"faithfulness", "answer_correctness", "context_correctness"} {
			req := newValidCreateRequest()
			req.OptimizationMetric = metric
			err := ValidateCreateAutoRAGRunRequest(req)
			assert.NoError(t, err, "metric %q should be valid", metric)
		}
	})

	t.Run("should reject invalid optimization_metric", func(t *testing.T) {
		req := newValidCreateRequest()
		req.OptimizationMetric = "invalid_metric"
		err := ValidateCreateAutoRAGRunRequest(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid optimization_metric")
	})

	t.Run("should allow empty optimization_metric", func(t *testing.T) {
		req := newValidCreateRequest()
		req.OptimizationMetric = ""
		err := ValidateCreateAutoRAGRunRequest(req)
		assert.NoError(t, err)
	})

	t.Run("should allow nil optimization_max_rag_patterns", func(t *testing.T) {
		req := newValidCreateRequest()
		req.OptimizationMaxRagPatterns = nil
		err := ValidateCreateAutoRAGRunRequest(req)
		assert.NoError(t, err)
	})

	t.Run("should accept valid optimization_max_rag_patterns", func(t *testing.T) {
		for _, value := range []int{4, 8, 12, 20} {
			req := newValidCreateRequest()
			req.OptimizationMaxRagPatterns = &value
			err := ValidateCreateAutoRAGRunRequest(req)
			assert.NoError(t, err, "value %d should be valid", value)
		}
	})

	t.Run("should reject optimization_max_rag_patterns below minimum", func(t *testing.T) {
		req := newValidCreateRequest()
		value := 3
		req.OptimizationMaxRagPatterns = &value
		err := ValidateCreateAutoRAGRunRequest(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "optimization_max_rag_patterns")
		assert.Contains(t, err.Error(), "at least 4")
	})

	t.Run("should reject optimization_max_rag_patterns above maximum", func(t *testing.T) {
		req := newValidCreateRequest()
		value := 21
		req.OptimizationMaxRagPatterns = &value
		err := ValidateCreateAutoRAGRunRequest(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "optimization_max_rag_patterns")
		assert.Contains(t, err.Error(), "at most 20")
	})

	t.Run("should accept display_name at exactly 250 characters", func(t *testing.T) {
		req := newValidCreateRequest()
		req.DisplayName = strings.Repeat("a", 250)
		err := ValidateCreateAutoRAGRunRequest(req)
		assert.NoError(t, err)
	})

	t.Run("should reject display_name exceeding 250 characters", func(t *testing.T) {
		req := newValidCreateRequest()
		req.DisplayName = strings.Repeat("a", 251)
		err := ValidateCreateAutoRAGRunRequest(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "display_name must be at most 250 characters")
	})

	t.Run("should accept display_name with 250 multi-byte characters", func(t *testing.T) {
		// Each character is multi-byte in UTF-8 but counts as 1 rune.
		// The limit is character-based (MySQL varchar(256) counts characters, not bytes).
		req := newValidCreateRequest()
		req.DisplayName = strings.Repeat("\u00e9", 250) // é = 2 bytes each, 500 bytes total
		err := ValidateCreateAutoRAGRunRequest(req)
		assert.NoError(t, err)
	})

	t.Run("should reject display_name with 251 multi-byte characters", func(t *testing.T) {
		req := newValidCreateRequest()
		req.DisplayName = strings.Repeat("\u00e9", 251)
		err := ValidateCreateAutoRAGRunRequest(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "display_name must be at most 250 characters")
	})
}
