package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/pipelineserver/psmocks"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// withDiscoveredPipeline adds a mock discovered pipeline map to the request context.
// IDs are derived from "test-namespace" to match the mock client created with "mock://test-namespace".
func withDiscoveredPipeline(req *http.Request) *http.Request {
	ids := psmocks.DeriveMockIDs("test-namespace")
	discovered := &repositories.DiscoveredPipeline{
		PipelineID:        ids.PipelineID,
		PipelineVersionID: ids.LatestVersionID,
		PipelineName:      "documents-rag-optimization-pipeline",
		Namespace:         "test-namespace",
	}
	pipelines := map[string]*repositories.DiscoveredPipeline{"autorag": discovered}
	ctx := context.WithValue(req.Context(), constants.DiscoveredPipelinesKey, pipelines)
	return req.WithContext(ctx)
}

func TestPipelineRunsHandler_Success(t *testing.T) {
	app := newTestApp(t)

	t.Run("should return pipeline runs with mock client", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs?namespace=test-namespace",
			nil,
		)
		assert.NoError(t, err)

		// Attach mock client to context
		mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)
		req = withDiscoveredPipeline(req)

		app.PipelineRunsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response PipelineRunsEnvelope
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		assert.NotNil(t, response.Data)
		// With discovered pipeline filter, mock returns only runs from that pipeline version (all 3 base runs)
		assert.Len(t, response.Data.Runs, 3, "Should return filtered pipeline runs from discovered pipeline")
		assert.Equal(t, int32(3), response.Data.TotalSize)

		// Verify pipeline_type is set to "autorag" on every returned run
		for i, run := range response.Data.Runs {
			assert.Equal(t, constants.PipelineTypeAutoRAG, run.PipelineType,
				"Runs[%d] pipeline_type should be %s", i, constants.PipelineTypeAutoRAG)
		}
	})

	t.Run("should handle pagination parameters", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs?namespace=test-namespace&pageSize=10&nextPageToken=token123",
			nil,
		)
		assert.NoError(t, err)

		mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)
		req = withDiscoveredPipeline(req)

		app.PipelineRunsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		// Verify pagination parameters were passed to the client
		require.NotNil(t, mockClient.LastListRunsParams, "Handler should have called ListRuns")
		assert.Equal(t, int32(10), mockClient.LastListRunsParams.PageSize,
			"PageSize should be forwarded to client")
		assert.Equal(t, "token123", mockClient.LastListRunsParams.PageToken,
			"NextPageToken should be forwarded to client")
	})
}

func TestPipelineRunsHandler_ErrorCases(t *testing.T) {
	app := newTestApp(t)

	t.Run("should fail without pipeline server client in context", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs?namespace=test-namespace",
			nil,
		)
		assert.NoError(t, err)

		// Don't attach client to context
		ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)

		app.PipelineRunsHandler(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})

	t.Run("should return empty runs list when no AutoRAG pipeline discovered", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs?namespace=test-namespace",
			nil,
		)
		assert.NoError(t, err)

		mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		// Set empty pipelines map (no AutoRAG pipeline discovered)
		ctx = context.WithValue(ctx, constants.DiscoveredPipelinesKey, map[string]*repositories.DiscoveredPipeline{})
		req = req.WithContext(ctx)

		app.PipelineRunsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		var response struct {
			Data models.PipelineRunsData `json:"data"`
		}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotNil(t, response.Data.Runs)
		assert.Len(t, response.Data.Runs, 0)
	})

}

func TestPipelineRunsHandler_ResponseFormat(t *testing.T) {
	app := newTestApp(t)

	t.Run("should return properly formatted envelope response", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs?namespace=test-namespace",
			nil,
		)
		assert.NoError(t, err)

		mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)
		req = withDiscoveredPipeline(req)

		app.PipelineRunsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		// Verify envelope structure
		dataField, exists := response["data"]
		assert.True(t, exists, "Response should have 'data' field")

		dataMap, ok := dataField.(map[string]interface{})
		assert.True(t, ok, "Data field should be a map[string]interface{}")

		_, hasRuns := dataMap["runs"]
		assert.True(t, hasRuns, "Data should have 'runs' field")

		_, hasTotalSize := dataMap["total_size"]
		assert.True(t, hasTotalSize, "Data should have 'total_size' field")
	})

	t.Run("should include required fields in pipeline run objects", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs?namespace=test-namespace",
			nil,
		)
		assert.NoError(t, err)

		mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)
		req = withDiscoveredPipeline(req)

		app.PipelineRunsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response struct {
			Data models.PipelineRunsData `json:"data"`
		}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		if len(response.Data.Runs) > 0 {
			run := response.Data.Runs[0]
			// Verify required fields
			assert.NotEmpty(t, run.RunID, "RunID should not be empty")
			assert.NotEmpty(t, run.DisplayName, "DisplayName should not be empty")
			assert.NotEmpty(t, run.State, "State should not be empty")
			assert.NotEmpty(t, run.CreatedAt, "CreatedAt should not be empty")

			// Verify enhanced fields are present
			assert.NotEmpty(t, run.ExperimentID, "ExperimentID should not be empty")
			assert.NotNil(t, run.PipelineVersionReference, "PipelineVersionReference should not be nil")
			if run.PipelineVersionReference != nil {
				assert.NotEmpty(t, run.PipelineVersionReference.PipelineID, "PipelineID should not be empty")
				assert.NotEmpty(t, run.PipelineVersionReference.PipelineVersionID, "PipelineVersionID should not be empty")
			}
			assert.NotEmpty(t, run.StorageState, "StorageState should not be empty")
			assert.NotEmpty(t, run.ServiceAccount, "ServiceAccount should not be empty")

			// Verify state history is present
			assert.NotNil(t, run.StateHistory, "StateHistory should not be nil")
			assert.Greater(t, len(run.StateHistory), 0, "StateHistory should have at least one entry")
			if len(run.StateHistory) > 0 {
				assert.NotEmpty(t, run.StateHistory[0].UpdateTime, "StateHistory UpdateTime should not be empty")
				assert.NotEmpty(t, run.StateHistory[0].State, "StateHistory State should not be empty")
			}

			// Verify run details are present
			assert.NotNil(t, run.RunDetails, "RunDetails should not be nil")
		}
	})

	t.Run("should include task details in listed runs", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs?namespace=test-namespace",
			nil,
		)
		assert.NoError(t, err)

		mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)
		req = withDiscoveredPipeline(req)

		app.PipelineRunsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response struct {
			Data models.PipelineRunsData `json:"data"`
		}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		// Verify at least one run has task details
		foundTaskDetails := false
		for _, run := range response.Data.Runs {
			if run.RunDetails != nil && run.RunDetails.TaskDetails != nil && len(run.RunDetails.TaskDetails) > 0 {
				foundTaskDetails = true
				// Verify task structure
				task := run.RunDetails.TaskDetails[0]
				assert.NotEmpty(t, task.TaskID, "Task ID should not be empty")
				assert.NotEmpty(t, task.DisplayName, "Task display name should not be empty")
				assert.NotEmpty(t, task.State, "Task state should not be empty")
				break
			}
		}
		assert.True(t, foundTaskDetails, "At least one run should have task details")
	})
}

// TestPipelineRunHandler tests the GET /api/v1/pipeline-runs/:runId endpoint
func TestPipelineRunHandler_Success(t *testing.T) {
	app := newTestApp(t)

	t.Run("should return single pipeline run by ID", func(t *testing.T) {
		rr := httptest.NewRecorder()
		runID := "run-abc123-def456"
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs/"+runID,
			nil,
		)
		require.NoError(t, err)

		// Attach mock client and discovered pipeline to context
		mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		discovered := &repositories.DiscoveredPipeline{
			PipelineID:        psmocks.DeriveMockIDs("test-namespace").PipelineID,
			PipelineVersionID: psmocks.DeriveMockIDs("test-namespace").LatestVersionID,
			PipelineName:      "documents-rag-optimization-pipeline",
			Namespace:         "test-namespace",
		}
		ctx = context.WithValue(ctx, constants.DiscoveredPipelinesKey, map[string]*repositories.DiscoveredPipeline{"autorag": discovered})
		req = req.WithContext(ctx)

		// Create params with runId
		params := httprouter.Params{
			httprouter.Param{Key: "runId", Value: runID},
		}

		app.PipelineRunHandler(rr, req, params)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response PipelineRunEnvelope
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.NotNil(t, response.Data)
		assert.Equal(t, runID, response.Data.RunID)

		// Verify the runID was passed to the client
		assert.Equal(t, runID, mockClient.LastGetRunID,
			"Handler should have called GetRun with the requested runID")
	})

	t.Run("should return properly formatted envelope response", func(t *testing.T) {
		rr := httptest.NewRecorder()
		runID := "run-test-123"
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs/"+runID,
			nil,
		)
		require.NoError(t, err)

		mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		discovered := &repositories.DiscoveredPipeline{
			PipelineID:        psmocks.DeriveMockIDs("test-namespace").PipelineID,
			PipelineVersionID: psmocks.DeriveMockIDs("test-namespace").LatestVersionID,
			PipelineName:      "documents-rag-optimization-pipeline",
			Namespace:         "test-namespace",
		}
		ctx = context.WithValue(ctx, constants.DiscoveredPipelinesKey, map[string]*repositories.DiscoveredPipeline{"autorag": discovered})
		req = req.WithContext(ctx)

		params := httprouter.Params{
			httprouter.Param{Key: "runId", Value: runID},
		}

		app.PipelineRunHandler(rr, req, params)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		// Verify envelope structure
		dataField, exists := response["data"]
		assert.True(t, exists, "Response should have 'data' field")
		assert.NotNil(t, dataField)
	})

	t.Run("should include all required fields in pipeline run", func(t *testing.T) {
		rr := httptest.NewRecorder()
		runID := "run-complete-test"
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs/"+runID,
			nil,
		)
		require.NoError(t, err)

		mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		discovered := &repositories.DiscoveredPipeline{
			PipelineID:        psmocks.DeriveMockIDs("test-namespace").PipelineID,
			PipelineVersionID: psmocks.DeriveMockIDs("test-namespace").LatestVersionID,
			PipelineName:      "documents-rag-optimization-pipeline",
			Namespace:         "test-namespace",
		}
		ctx = context.WithValue(ctx, constants.DiscoveredPipelinesKey, map[string]*repositories.DiscoveredPipeline{"autorag": discovered})
		req = req.WithContext(ctx)

		params := httprouter.Params{
			httprouter.Param{Key: "runId", Value: runID},
		}

		app.PipelineRunHandler(rr, req, params)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response struct {
			Data models.PipelineRun `json:"data"`
		}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		run := response.Data
		// Verify required fields
		assert.Equal(t, runID, run.RunID)
		assert.NotEmpty(t, run.DisplayName, "DisplayName should not be empty")
		assert.NotEmpty(t, run.State, "State should not be empty")
		assert.NotEmpty(t, run.CreatedAt, "CreatedAt should not be empty")

		// Verify enhanced fields
		assert.NotEmpty(t, run.ExperimentID, "ExperimentID should not be empty")
		assert.NotNil(t, run.PipelineVersionReference, "PipelineVersionReference should not be nil")
		if run.PipelineVersionReference != nil {
			assert.NotEmpty(t, run.PipelineVersionReference.PipelineID)
			assert.NotEmpty(t, run.PipelineVersionReference.PipelineVersionID)
		}
		assert.NotEmpty(t, run.StorageState, "StorageState should not be empty")
		assert.NotEmpty(t, run.ServiceAccount, "ServiceAccount should not be empty")

		// Verify state history
		assert.NotNil(t, run.StateHistory, "StateHistory should not be nil")

		// Verify run details and task details
		assert.NotNil(t, run.RunDetails, "RunDetails should not be nil")
		if run.RunDetails != nil && len(run.RunDetails.TaskDetails) > 0 {
			task := run.RunDetails.TaskDetails[0]
			assert.NotEmpty(t, task.TaskID, "Task ID should not be empty")
			assert.NotEmpty(t, task.DisplayName, "Task display name should not be empty")
			assert.NotEmpty(t, task.State, "Task state should not be empty")
		}

		// Verify pipeline_type is set to "autorag"
		assert.Equal(t, constants.PipelineTypeAutoRAG, run.PipelineType, "pipeline_type should be autorag")
	})

	t.Run("should include task details with inputs and outputs", func(t *testing.T) {
		rr := httptest.NewRecorder()
		runID := "run-with-tasks"
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs/"+runID,
			nil,
		)
		require.NoError(t, err)

		mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		discovered := &repositories.DiscoveredPipeline{
			PipelineID:        psmocks.DeriveMockIDs("test-namespace").PipelineID,
			PipelineVersionID: psmocks.DeriveMockIDs("test-namespace").LatestVersionID,
			PipelineName:      "documents-rag-optimization-pipeline",
			Namespace:         "test-namespace",
		}
		ctx = context.WithValue(ctx, constants.DiscoveredPipelinesKey, map[string]*repositories.DiscoveredPipeline{"autorag": discovered})
		req = req.WithContext(ctx)

		params := httprouter.Params{
			httprouter.Param{Key: "runId", Value: runID},
		}

		app.PipelineRunHandler(rr, req, params)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response struct {
			Data models.PipelineRun `json:"data"`
		}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		// Verify run details and task details are present
		assert.NotNil(t, response.Data.RunDetails, "RunDetails should be present")
		require.NotNil(t, response.Data.RunDetails, "RunDetails required for further checks")
		assert.Greater(t, len(response.Data.RunDetails.TaskDetails), 0, "Should have at least one task")

		// Verify task structure
		if len(response.Data.RunDetails.TaskDetails) > 0 {
			task := response.Data.RunDetails.TaskDetails[0]
			assert.NotEmpty(t, task.TaskID)
			assert.NotEmpty(t, task.DisplayName)
			assert.NotEmpty(t, task.State)
		}
	})
}

func TestPipelineRunHandler_ErrorCases(t *testing.T) {
	app := newTestApp(t)

	t.Run("should fail without pipeline server client in context", func(t *testing.T) {
		rr := httptest.NewRecorder()
		runID := "run-test-123"
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs/"+runID,
			nil,
		)
		require.NoError(t, err)

		// Don't attach client to context
		ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)

		params := httprouter.Params{
			httprouter.Param{Key: "runId", Value: runID},
		}

		app.PipelineRunHandler(rr, req, params)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})

	t.Run("should fail with empty runId", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs/",
			nil,
		)
		require.NoError(t, err)

		mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		discovered := &repositories.DiscoveredPipeline{
			PipelineID:        psmocks.DeriveMockIDs("test-namespace").PipelineID,
			PipelineVersionID: psmocks.DeriveMockIDs("test-namespace").LatestVersionID,
			PipelineName:      "documents-rag-optimization-pipeline",
			Namespace:         "test-namespace",
		}
		ctx = context.WithValue(ctx, constants.DiscoveredPipelinesKey, map[string]*repositories.DiscoveredPipeline{"autorag": discovered})
		req = req.WithContext(ctx)

		// Pass empty runId
		params := httprouter.Params{
			httprouter.Param{Key: "runId", Value: ""},
		}

		app.PipelineRunHandler(rr, req, params)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		var response struct {
			Error struct {
				Code    string `json:"code"`
				Message string `json:"message"`
			} `json:"error"`
		}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Contains(t, response.Error.Message, "missing runId parameter")
	})

	t.Run("should return 404 for non-existent run ID", func(t *testing.T) {
		rr := httptest.NewRecorder()
		runID := "non-existent-run-id" // Special ID that triggers 404 in mock
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs/"+runID,
			nil,
		)
		require.NoError(t, err)

		mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		discovered := &repositories.DiscoveredPipeline{
			PipelineID:        psmocks.DeriveMockIDs("test-namespace").PipelineID,
			PipelineVersionID: psmocks.DeriveMockIDs("test-namespace").LatestVersionID,
			PipelineName:      "documents-rag-optimization-pipeline",
			Namespace:         "test-namespace",
		}
		ctx = context.WithValue(ctx, constants.DiscoveredPipelinesKey, map[string]*repositories.DiscoveredPipeline{"autorag": discovered})
		req = req.WithContext(ctx)

		params := httprouter.Params{
			httprouter.Param{Key: "runId", Value: runID},
		}

		app.PipelineRunHandler(rr, req, params)

		// Should return 404 Not Found
		assert.Equal(t, http.StatusNotFound, rr.Code)

		var response struct {
			Error struct {
				Code    string `json:"code"`
				Message string `json:"message"`
			} `json:"error"`
		}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, "404", response.Error.Code)
		assert.Contains(t, response.Error.Message, "could not be found")
	})

	t.Run("should return 500 for pipeline server errors", func(t *testing.T) {
		rr := httptest.NewRecorder()
		runID := "server-error-run-id" // Special ID that triggers 500 in mock
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs/"+runID,
			nil,
		)
		require.NoError(t, err)

		mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		discovered := &repositories.DiscoveredPipeline{
			PipelineID:        psmocks.DeriveMockIDs("test-namespace").PipelineID,
			PipelineVersionID: psmocks.DeriveMockIDs("test-namespace").LatestVersionID,
			PipelineName:      "documents-rag-optimization-pipeline",
			Namespace:         "test-namespace",
		}
		ctx = context.WithValue(ctx, constants.DiscoveredPipelinesKey, map[string]*repositories.DiscoveredPipeline{"autorag": discovered})
		req = req.WithContext(ctx)

		params := httprouter.Params{
			httprouter.Param{Key: "runId", Value: runID},
		}

		app.PipelineRunHandler(rr, req, params)

		// Should return 500 Internal Server Error
		assert.Equal(t, http.StatusInternalServerError, rr.Code)

		var response struct {
			Error struct {
				Code    string `json:"code"`
				Message string `json:"message"`
			} `json:"error"`
		}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, "500", response.Error.Code)
		assert.Contains(t, response.Error.Message, "server encountered a problem")
	})

	t.Run("should return 404 when run belongs to different pipeline", func(t *testing.T) {
		rr := httptest.NewRecorder()
		runID := "run-different-pipeline"
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs/"+runID,
			nil,
		)
		require.NoError(t, err)

		// Create mock client that returns a run with different pipeline ID
		mockClient := &differentPipelineMockClient{
			MockPipelineServerClient: *psmocks.NewMockPipelineServerClient("mock://test-namespace"),
		}
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")

		// Discovered pipeline has specific IDs
		discovered := &repositories.DiscoveredPipeline{
			PipelineID:        psmocks.DeriveMockIDs("test-namespace").PipelineID,
			PipelineVersionID: psmocks.DeriveMockIDs("test-namespace").LatestVersionID,
			PipelineName:      "documents-rag-optimization-pipeline",
			Namespace:         "test-namespace",
		}
		ctx = context.WithValue(ctx, constants.DiscoveredPipelinesKey, map[string]*repositories.DiscoveredPipeline{"autorag": discovered})
		req = req.WithContext(ctx)

		params := httprouter.Params{
			httprouter.Param{Key: "runId", Value: runID},
		}

		app.PipelineRunHandler(rr, req, params)

		// Should return 404 because run belongs to different pipeline
		assert.Equal(t, http.StatusNotFound, rr.Code)
	})

	t.Run("should return 404 when no discovered pipeline in context", func(t *testing.T) {
		rr := httptest.NewRecorder()
		runID := "run-test-123"
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs/"+runID,
			nil,
		)
		require.NoError(t, err)

		mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		// Inject empty map — simulates middleware running but no pipeline found
		ctx = context.WithValue(ctx, constants.DiscoveredPipelinesKey, map[string]*repositories.DiscoveredPipeline{})
		req = req.WithContext(ctx)

		params := httprouter.Params{
			httprouter.Param{Key: "runId", Value: runID},
		}

		app.PipelineRunHandler(rr, req, params)

		// With no discovered pipeline, the ownership check fails and returns 404
		assert.Equal(t, http.StatusNotFound, rr.Code)
	})

	t.Run("should return 404 when run has nil PipelineVersionReference", func(t *testing.T) {
		rr := httptest.NewRecorder()
		runID := "run-nil-reference"
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs/"+runID,
			nil,
		)
		require.NoError(t, err)

		// Create mock client that returns a run with nil PipelineVersionReference
		mockClient := &nilPipelineReferenceMockClient{
			MockPipelineServerClient: *psmocks.NewMockPipelineServerClient("mock://test-namespace"),
		}
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")

		// Discovered pipeline
		discovered := &repositories.DiscoveredPipeline{
			PipelineID:        psmocks.DeriveMockIDs("test-namespace").PipelineID,
			PipelineVersionID: psmocks.DeriveMockIDs("test-namespace").LatestVersionID,
			PipelineName:      "documents-rag-optimization-pipeline",
			Namespace:         "test-namespace",
		}
		ctx = context.WithValue(ctx, constants.DiscoveredPipelinesKey, map[string]*repositories.DiscoveredPipeline{"autorag": discovered})
		req = req.WithContext(ctx)

		params := httprouter.Params{
			httprouter.Param{Key: "runId", Value: runID},
		}

		app.PipelineRunHandler(rr, req, params)

		// Should return 404 for security (data integrity issue)
		assert.Equal(t, http.StatusNotFound, rr.Code)
	})
}

// differentPipelineMockClient returns runs with a different pipeline ID
type differentPipelineMockClient struct {
	psmocks.MockPipelineServerClient
}

func (m *differentPipelineMockClient) GetRun(ctx context.Context, runID string) (*models.KFPipelineRun, error) {
	run := &models.KFPipelineRun{
		RunID:       runID,
		DisplayName: "Different Pipeline Run",
		State:       "SUCCEEDED",
		PipelineVersionReference: &models.PipelineVersionReference{
			PipelineID:        "different-pipeline-id",
			PipelineVersionID: "different-version-id",
		},
		CreatedAt: "2024-01-01T00:00:00Z",
	}
	return run, nil
}

// nilPipelineReferenceMockClient returns runs with nil PipelineVersionReference
type nilPipelineReferenceMockClient struct {
	psmocks.MockPipelineServerClient
}

func (m *nilPipelineReferenceMockClient) GetRun(ctx context.Context, runID string) (*models.KFPipelineRun, error) {
	run := &models.KFPipelineRun{
		RunID:                    runID,
		DisplayName:              "Run Without Pipeline Reference",
		State:                    "SUCCEEDED",
		PipelineVersionReference: nil, // Missing pipeline reference
		CreatedAt:                "2024-01-01T00:00:00Z",
	}
	return run, nil
}
