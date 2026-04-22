package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	pipelineserver "github.com/opendatahub-io/autorag-library/bff/internal/integrations/pipelineserver"
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

// Helper function to execute pipeline run handler and return response recorder.
func executePipelineRunHandler(app *App, runID, namespace string) *httptest.ResponseRecorder {
	req := newPipelineRunGetRequest(runID)
	mockClient := psmocks.NewMockPipelineServerClient("mock://" + namespace)
	discovered := newMockDiscoveredPipeline(namespace)
	req = setPipelineRunContext(req, mockClient, namespace, discovered)

	params := httprouter.Params{httprouter.Param{Key: "runId", Value: runID}}
	rr := httptest.NewRecorder()

	app.PipelineRunHandler(rr, req, params)
	return rr
}

// Helper function to assert required pipeline run fields.
func assertPipelineRunRequiredFields(t *testing.T, run models.PipelineRun, expectedRunID string) {
	t.Helper()

	assert.Equal(t, expectedRunID, run.RunID)
	assert.NotEmpty(t, run.DisplayName, "DisplayName should not be empty")
	assert.NotEmpty(t, run.State, "State should not be empty")
	assert.NotEmpty(t, run.CreatedAt, "CreatedAt should not be empty")
	assert.NotEmpty(t, run.ExperimentID, "ExperimentID should not be empty")
	assert.NotEmpty(t, run.StorageState, "StorageState should not be empty")
	assert.NotEmpty(t, run.ServiceAccount, "ServiceAccount should not be empty")
	assert.Equal(t, constants.PipelineTypeAutoRAG, run.PipelineType, "pipeline_type should be autorag")
}

// Helper function to assert pipeline version reference fields.
func assertPipelineVersionReference(t *testing.T, ref *models.PipelineVersionReference) {
	t.Helper()

	require.NotNil(t, ref, "PipelineVersionReference should not be nil")
	assert.NotEmpty(t, ref.PipelineID, "PipelineID should not be empty")
	assert.NotEmpty(t, ref.PipelineVersionID, "PipelineVersionID should not be empty")
}

// TestPipelineRunHandler_ReturnsSingleRun verifies that the handler returns
// a single pipeline run by ID with correct runID in the response.
func TestPipelineRunHandler_ReturnsSingleRun(t *testing.T) {
	app := newTestApp(t)
	runID := "run-abc123-def456"
	namespace := "test-namespace"

	rr := executePipelineRunHandler(app, runID, namespace)

	assert.Equal(t, http.StatusOK, rr.Code)

	var response PipelineRunEnvelope
	err := json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.NotNil(t, response.Data)
	assert.Equal(t, runID, response.Data.RunID)
}

// TestPipelineRunHandler_EnvelopeFormat verifies that the handler returns
// a properly formatted envelope response with a "data" field.
func TestPipelineRunHandler_EnvelopeFormat(t *testing.T) {
	app := newTestApp(t)
	runID := "run-test-123"

	rr := executePipelineRunHandler(app, runID, "test-namespace")

	assert.Equal(t, http.StatusOK, rr.Code)

	var response map[string]any
	err := json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)

	dataField, exists := response["data"]
	assert.True(t, exists, "Response should have 'data' field")
	assert.NotNil(t, dataField, "Data field should not be nil")
}

// TestPipelineRunHandler_RequiredFields verifies that the handler returns
// all required fields in the pipeline run response.
func TestPipelineRunHandler_RequiredFields(t *testing.T) {
	app := newTestApp(t)
	runID := "run-complete-test"

	rr := executePipelineRunHandler(app, runID, "test-namespace")

	assert.Equal(t, http.StatusOK, rr.Code)

	var response struct {
		Data models.PipelineRun `json:"data"`
	}
	err := json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)

	run := response.Data

	// Verify all required fields
	assertPipelineRunRequiredFields(t, run, runID)
	assertPipelineVersionReference(t, run.PipelineVersionReference)

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
}

// TestPipelineRunHandler_TaskDetails verifies that the handler includes
// task details with proper structure in the pipeline run response.
func TestPipelineRunHandler_TaskDetails(t *testing.T) {
	app := newTestApp(t)
	runID := "run-with-tasks"

	rr := executePipelineRunHandler(app, runID, "test-namespace")

	assert.Equal(t, http.StatusOK, rr.Code)

	var response struct {
		Data models.PipelineRun `json:"data"`
	}
	err := json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)

	// Verify run details and task details are present
	require.NotNil(t, response.Data.RunDetails, "RunDetails should be present")
	assert.Greater(t, len(response.Data.RunDetails.TaskDetails), 0, "Should have at least one task")

	// Verify task structure
	if len(response.Data.RunDetails.TaskDetails) > 0 {
		task := response.Data.RunDetails.TaskDetails[0]
		assert.NotEmpty(t, task.TaskID, "Task ID should not be empty")
		assert.NotEmpty(t, task.DisplayName, "Task display name should not be empty")
		assert.NotEmpty(t, task.State, "Task state should not be empty")
	}
}

// Helper function to create a GET request for pipeline run handler.
func newPipelineRunGetRequest(runID string) *http.Request {
	url := "/api/v1/pipeline-runs/" + runID
	req, _ := http.NewRequest(http.MethodGet, url, nil)
	return req
}

// Helper function to create a mock discovered pipeline for testing.
func newMockDiscoveredPipeline(namespace string) *repositories.DiscoveredPipeline {
	return &repositories.DiscoveredPipeline{
		PipelineID:        psmocks.DeriveMockIDs(namespace).PipelineID,
		PipelineVersionID: psmocks.DeriveMockIDs(namespace).LatestVersionID,
		PipelineName:      "documents-rag-optimization-pipeline",
		Namespace:         namespace,
	}
}

// Helper function to set up request context with pipeline server client, namespace, and discovered pipeline.
func setPipelineRunContext(req *http.Request, mockClient pipelineserver.PipelineServerClientInterface, namespace string, discovered *repositories.DiscoveredPipeline) *http.Request {
	ctx := req.Context()
	ctx = context.WithValue(ctx, constants.PipelineServerClientKey, mockClient)
	ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, namespace)

	if discovered != nil {
		ctx = context.WithValue(ctx, constants.DiscoveredPipelinesKey, map[string]*repositories.DiscoveredPipeline{"autorag": discovered})
	} else {
		// Empty map simulates middleware running but no pipeline found
		ctx = context.WithValue(ctx, constants.DiscoveredPipelinesKey, map[string]*repositories.DiscoveredPipeline{})
	}

	return req.WithContext(ctx)
}

// Helper function to assert pipeline run error responses.
func assertPipelineRunErrorResponse(t *testing.T, rr *httptest.ResponseRecorder, expectedStatus int, expectedCode string, messageSubstring string) {
	t.Helper()

	assert.Equal(t, expectedStatus, rr.Code)

	if expectedCode != "" {
		var response struct {
			Error struct {
				Code    string `json:"code"`
				Message string `json:"message"`
			} `json:"error"`
		}
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, expectedCode, response.Error.Code)
		if messageSubstring != "" {
			assert.Contains(t, response.Error.Message, messageSubstring)
		}
	}
}

// TestPipelineRunHandler_MissingPipelineServerClient verifies that the handler
// returns 500 when the pipeline server client is not in the request context.
func TestPipelineRunHandler_MissingPipelineServerClient(t *testing.T) {
	app := newTestApp(t)
	runID := "run-test-123"

	req := newPipelineRunGetRequest(runID)
	// Don't attach client to context - only set namespace
	ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "test-namespace")
	req = req.WithContext(ctx)

	params := httprouter.Params{httprouter.Param{Key: "runId", Value: runID}}
	rr := httptest.NewRecorder()

	app.PipelineRunHandler(rr, req, params)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

// TestPipelineRunHandler_EmptyRunID verifies that the handler returns 400
// when the runId parameter is empty.
func TestPipelineRunHandler_EmptyRunID(t *testing.T) {
	app := newTestApp(t)
	namespace := "test-namespace"

	req := newPipelineRunGetRequest("")
	mockClient := psmocks.NewMockPipelineServerClient("mock://" + namespace)
	discovered := newMockDiscoveredPipeline(namespace)
	req = setPipelineRunContext(req, mockClient, namespace, discovered)

	params := httprouter.Params{httprouter.Param{Key: "runId", Value: ""}}
	rr := httptest.NewRecorder()

	app.PipelineRunHandler(rr, req, params)

	assertPipelineRunErrorResponse(t, rr, http.StatusBadRequest, "", "missing runId parameter")
}

// TestPipelineRunHandler_NonExistentRunID verifies that the handler returns 404
// when the run ID does not exist in the pipeline server.
func TestPipelineRunHandler_NonExistentRunID(t *testing.T) {
	app := newTestApp(t)
	namespace := "test-namespace"
	runID := "non-existent-run-id" // Special ID that triggers 404 in mock

	req := newPipelineRunGetRequest(runID)
	mockClient := psmocks.NewMockPipelineServerClient("mock://" + namespace)
	discovered := newMockDiscoveredPipeline(namespace)
	req = setPipelineRunContext(req, mockClient, namespace, discovered)

	params := httprouter.Params{httprouter.Param{Key: "runId", Value: runID}}
	rr := httptest.NewRecorder()

	app.PipelineRunHandler(rr, req, params)

	assertPipelineRunErrorResponse(t, rr, http.StatusNotFound, "404", "could not be found")
}

// TestPipelineRunHandler_PipelineServerError verifies that the handler returns 500
// when the pipeline server encounters an internal error.
func TestPipelineRunHandler_PipelineServerError(t *testing.T) {
	app := newTestApp(t)
	namespace := "test-namespace"
	runID := "server-error-run-id" // Special ID that triggers 500 in mock

	req := newPipelineRunGetRequest(runID)
	mockClient := psmocks.NewMockPipelineServerClient("mock://" + namespace)
	discovered := newMockDiscoveredPipeline(namespace)
	req = setPipelineRunContext(req, mockClient, namespace, discovered)

	params := httprouter.Params{httprouter.Param{Key: "runId", Value: runID}}
	rr := httptest.NewRecorder()

	app.PipelineRunHandler(rr, req, params)

	assertPipelineRunErrorResponse(t, rr, http.StatusInternalServerError, "500", "server encountered a problem")
}

// TestPipelineRunHandler_RunBelongsToDifferentPipeline verifies that the handler
// returns 404 when the run belongs to a different pipeline than the discovered one.
func TestPipelineRunHandler_RunBelongsToDifferentPipeline(t *testing.T) {
	app := newTestApp(t)
	namespace := "test-namespace"
	runID := "run-different-pipeline"

	req := newPipelineRunGetRequest(runID)
	// Use mock client that returns a run with different pipeline ID
	mockClient := &differentPipelineMockClient{
		MockPipelineServerClient: *psmocks.NewMockPipelineServerClient("mock://" + namespace),
	}
	discovered := newMockDiscoveredPipeline(namespace)
	req = setPipelineRunContext(req, mockClient, namespace, discovered)

	params := httprouter.Params{httprouter.Param{Key: "runId", Value: runID}}
	rr := httptest.NewRecorder()

	app.PipelineRunHandler(rr, req, params)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

// TestPipelineRunHandler_NoDiscoveredPipeline verifies that the handler returns 404
// when there is no discovered pipeline in the request context.
func TestPipelineRunHandler_NoDiscoveredPipeline(t *testing.T) {
	app := newTestApp(t)
	namespace := "test-namespace"
	runID := "run-test-123"

	req := newPipelineRunGetRequest(runID)
	mockClient := psmocks.NewMockPipelineServerClient("mock://" + namespace)
	req = setPipelineRunContext(req, mockClient, namespace, nil) // nil = no discovered pipeline

	params := httprouter.Params{httprouter.Param{Key: "runId", Value: runID}}
	rr := httptest.NewRecorder()

	app.PipelineRunHandler(rr, req, params)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

// TestPipelineRunHandler_NilPipelineVersionReference verifies that the handler returns 404
// when the run has a nil PipelineVersionReference (data integrity issue).
func TestPipelineRunHandler_NilPipelineVersionReference(t *testing.T) {
	app := newTestApp(t)
	namespace := "test-namespace"
	runID := "run-nil-reference"

	req := newPipelineRunGetRequest(runID)
	// Use mock client that returns a run with nil PipelineVersionReference
	mockClient := &nilPipelineReferenceMockClient{
		MockPipelineServerClient: *psmocks.NewMockPipelineServerClient("mock://" + namespace),
	}
	discovered := newMockDiscoveredPipeline(namespace)
	req = setPipelineRunContext(req, mockClient, namespace, discovered)

	params := httprouter.Params{httprouter.Param{Key: "runId", Value: runID}}
	rr := httptest.NewRecorder()

	app.PipelineRunHandler(rr, req, params)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

// failedRunMockClient returns runs with FAILED state for retry testing
type failedRunMockClient struct {
	psmocks.MockPipelineServerClient
}

func (m *failedRunMockClient) GetRun(_ context.Context, runID string) (*models.KFPipelineRun, error) {
	ids := psmocks.DeriveMockIDs(m.Namespace)
	run := &models.KFPipelineRun{
		RunID:       runID,
		DisplayName: "Failed AutoRAG Run",
		State:       "FAILED",
		PipelineVersionReference: &models.PipelineVersionReference{
			PipelineID:        ids.PipelineID,
			PipelineVersionID: ids.LatestVersionID,
		},
		CreatedAt: "2024-01-01T00:00:00Z",
	}
	return run, nil
}

// succeededRunMockClient returns runs with SUCCEEDED state (not retryable)
type succeededRunMockClient struct {
	psmocks.MockPipelineServerClient
}

func (m *succeededRunMockClient) GetRun(_ context.Context, runID string) (*models.KFPipelineRun, error) {
	ids := psmocks.DeriveMockIDs(m.Namespace)
	run := &models.KFPipelineRun{
		RunID:       runID,
		DisplayName: "Succeeded AutoRAG Run",
		State:       "SUCCEEDED",
		PipelineVersionReference: &models.PipelineVersionReference{
			PipelineID:        ids.PipelineID,
			PipelineVersionID: ids.LatestVersionID,
		},
		CreatedAt: "2024-01-01T00:00:00Z",
	}
	return run, nil
}

// differentPipelineMockClient returns runs with a different pipeline ID
type differentPipelineMockClient struct {
	psmocks.MockPipelineServerClient
}

func (m *differentPipelineMockClient) GetRun(_ context.Context, runID string) (*models.KFPipelineRun, error) {
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

func (m *nilPipelineReferenceMockClient) GetRun(_ context.Context, runID string) (*models.KFPipelineRun, error) {
	run := &models.KFPipelineRun{
		RunID:                    runID,
		DisplayName:              "Run Without Pipeline Reference",
		State:                    "SUCCEEDED",
		PipelineVersionReference: nil, // Missing pipeline reference
		CreatedAt:                "2024-01-01T00:00:00Z",
	}
	return run, nil
}

// runningRunMockClient returns runs with RUNNING state for terminate testing
type runningRunMockClient struct {
	psmocks.MockPipelineServerClient
}

func (m *runningRunMockClient) GetRun(_ context.Context, runID string) (*models.KFPipelineRun, error) {
	ids := psmocks.DeriveMockIDs(m.Namespace)
	return &models.KFPipelineRun{
		RunID:       runID,
		DisplayName: "Running AutoRAG Run",
		State:       "RUNNING",
		PipelineVersionReference: &models.PipelineVersionReference{
			PipelineID:        ids.PipelineID,
			PipelineVersionID: ids.LatestVersionID,
		},
		CreatedAt: "2024-01-01T00:00:00Z",
	}, nil
}

// TestTerminatePipelineRunHandler tests the POST /api/v1/pipeline-runs/:runId/terminate endpoint
func TestTerminatePipelineRunHandler_Success(t *testing.T) {
	app := newTestApp(t)

	t.Run("should terminate a running pipeline run", func(t *testing.T) {
		rr := httptest.NewRecorder()
		runID := "run-abc123-def456"
		req, err := http.NewRequest(
			http.MethodPost,
			"/api/v1/pipeline-runs/"+runID+"/terminate",
			nil,
		)
		require.NoError(t, err)

		mockClient := &runningRunMockClient{
			MockPipelineServerClient: *psmocks.NewMockPipelineServerClient("mock://test-namespace"),
		}
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)
		req = withDiscoveredPipeline(req)

		params := httprouter.Params{
			httprouter.Param{Key: "runId", Value: runID},
		}

		app.TerminatePipelineRunHandler(rr, req, params)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, runID, mockClient.LastTerminateRunID,
			"Handler should have called TerminateRun with the requested runID")
	})
}

// Helper function to create a POST request for terminate pipeline run handler.
func newTerminatePipelineRunRequest(runID string) *http.Request {
	url := "/api/v1/pipeline-runs/" + runID + "/terminate"
	req, _ := http.NewRequest(http.MethodPost, url, nil)
	return req
}

// Helper function to execute terminate pipeline run handler with full context.
func executeTerminateHandler(app *App, runID, namespace string, mockClient pipelineserver.PipelineServerClientInterface, withDiscoveredPipeline bool) *httptest.ResponseRecorder {
	req := newTerminatePipelineRunRequest(runID)

	var discovered *repositories.DiscoveredPipeline
	if withDiscoveredPipeline {
		discovered = newMockDiscoveredPipeline(namespace)
	}

	req = setPipelineRunContext(req, mockClient, namespace, discovered)
	params := httprouter.Params{httprouter.Param{Key: "runId", Value: runID}}
	rr := httptest.NewRecorder()

	app.TerminatePipelineRunHandler(rr, req, params)
	return rr
}

// TestTerminatePipelineRunHandler_MissingPipelineServerClient verifies that the handler
// returns 500 when the pipeline server client is not in the request context.
func TestTerminatePipelineRunHandler_MissingPipelineServerClient(t *testing.T) {
	app := newTestApp(t)
	runID := "run-test-123"

	req := newTerminatePipelineRunRequest(runID)
	// Only set namespace, no pipeline server client
	ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "test-namespace")
	req = req.WithContext(ctx)

	params := httprouter.Params{httprouter.Param{Key: "runId", Value: runID}}
	rr := httptest.NewRecorder()

	app.TerminatePipelineRunHandler(rr, req, params)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

// TestTerminatePipelineRunHandler_EmptyRunID verifies that the handler returns 400
// when the runId parameter is empty.
func TestTerminatePipelineRunHandler_EmptyRunID(t *testing.T) {
	app := newTestApp(t)
	namespace := "test-namespace"

	mockClient := psmocks.NewMockPipelineServerClient("mock://" + namespace)
	rr := executeTerminateHandler(app, "", namespace, mockClient, true)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

// TestTerminatePipelineRunHandler_NonExistentRunID verifies that the handler returns 404
// when the run ID does not exist in the pipeline server.
func TestTerminatePipelineRunHandler_NonExistentRunID(t *testing.T) {
	app := newTestApp(t)
	namespace := "test-namespace"
	runID := "non-existent-run-id" // Special ID that triggers 404 in mock

	mockClient := psmocks.NewMockPipelineServerClient("mock://" + namespace)
	rr := executeTerminateHandler(app, runID, namespace, mockClient, true)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

// TestTerminatePipelineRunHandler_RunBelongsToDifferentPipeline verifies that the handler
// returns 404 when the run belongs to a different pipeline than the discovered one.
func TestTerminatePipelineRunHandler_RunBelongsToDifferentPipeline(t *testing.T) {
	app := newTestApp(t)
	namespace := "test-namespace"
	runID := "run-different-pipeline"

	// Use mock client that returns a run with different pipeline ID
	mockClient := &differentPipelineMockClient{
		MockPipelineServerClient: *psmocks.NewMockPipelineServerClient("mock://" + namespace),
	}
	rr := executeTerminateHandler(app, runID, namespace, mockClient, true)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

// TestTerminatePipelineRunHandler_NonTerminatableState verifies that the handler returns 400
// when the run is not in a terminatable state (e.g., SUCCEEDED, FAILED).
func TestTerminatePipelineRunHandler_NonTerminatableState(t *testing.T) {
	app := newTestApp(t)
	namespace := "test-namespace"
	runID := "run-succeeded"

	// succeededRunMockClient returns SUCCEEDED state (not terminatable)
	mockClient := &succeededRunMockClient{
		MockPipelineServerClient: *psmocks.NewMockPipelineServerClient("mock://" + namespace),
	}
	rr := executeTerminateHandler(app, runID, namespace, mockClient, true)

	assert.Equal(t, http.StatusBadRequest, rr.Code)

	var response struct {
		Error struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	err := json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Contains(t, response.Error.Message, "cannot be terminated")
	assert.Empty(t, mockClient.LastTerminateRunID,
		"TerminateRun should not have been called for a non-terminatable run")
}

// TestTerminatePipelineRunHandler_NoDiscoveredPipeline verifies that the handler returns 404
// when there is no discovered pipeline in the request context.
func TestTerminatePipelineRunHandler_NoDiscoveredPipeline(t *testing.T) {
	app := newTestApp(t)
	namespace := "test-namespace"
	runID := "run-test-123"

	mockClient := psmocks.NewMockPipelineServerClient("mock://" + namespace)
	rr := executeTerminateHandler(app, runID, namespace, mockClient, false) // false = no discovered pipeline

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

// TestTerminatePipelineRunHandler_NilPipelineVersionReference verifies that the handler returns 404
// when the run has a nil PipelineVersionReference (data integrity issue).
func TestTerminatePipelineRunHandler_NilPipelineVersionReference(t *testing.T) {
	app := newTestApp(t)
	namespace := "test-namespace"
	runID := "run-nil-reference"

	// Use mock client that returns a run with nil PipelineVersionReference
	mockClient := &nilPipelineReferenceMockClient{
		MockPipelineServerClient: *psmocks.NewMockPipelineServerClient("mock://" + namespace),
	}
	rr := executeTerminateHandler(app, runID, namespace, mockClient, true)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

// terminateErrorMockClient returns a RUNNING run from GetRun (ownership passes)
// but returns a configurable error from TerminateRun so that mapMutationError is exercised.
type terminateErrorMockClient struct {
	psmocks.MockPipelineServerClient
	terminateErr       error
	terminateCalled    bool
	terminateCalledFor string
}

func (m *terminateErrorMockClient) GetRun(_ context.Context, runID string) (*models.KFPipelineRun, error) {
	ids := psmocks.DeriveMockIDs(m.Namespace)
	return &models.KFPipelineRun{
		RunID:       runID,
		DisplayName: "Running AutoRAG Run",
		State:       "RUNNING",
		PipelineVersionReference: &models.PipelineVersionReference{
			PipelineID:        ids.PipelineID,
			PipelineVersionID: ids.LatestVersionID,
		},
		CreatedAt: "2024-01-01T00:00:00Z",
	}, nil
}

func (m *terminateErrorMockClient) TerminateRun(_ context.Context, runID string) error {
	m.terminateCalled = true
	m.terminateCalledFor = runID
	return m.terminateErr
}

// retryErrorMockClient returns a FAILED run from GetRun (ownership passes)
// but returns a configurable error from RetryRun so that mapMutationError is exercised.
type retryErrorMockClient struct {
	psmocks.MockPipelineServerClient
	retryErr       error
	retryCalled    bool
	retryCalledFor string
}

func (m *retryErrorMockClient) GetRun(_ context.Context, runID string) (*models.KFPipelineRun, error) {
	ids := psmocks.DeriveMockIDs(m.Namespace)
	return &models.KFPipelineRun{
		RunID:       runID,
		DisplayName: "Failed AutoRAG Run",
		State:       "FAILED",
		PipelineVersionReference: &models.PipelineVersionReference{
			PipelineID:        ids.PipelineID,
			PipelineVersionID: ids.LatestVersionID,
		},
		CreatedAt: "2024-01-01T00:00:00Z",
	}, nil
}

func (m *retryErrorMockClient) RetryRun(_ context.Context, runID string) error {
	m.retryCalled = true
	m.retryCalledFor = runID
	return m.retryErr
}

func TestTerminatePipelineRunHandler_MutationErrors(t *testing.T) {
	app := newTestApp(t)

	tests := []struct {
		name           string
		terminateErr   error
		expectedStatus int
	}{
		{
			name:           "should return 404 when TerminateRun returns not-found",
			terminateErr:   repositories.ErrPipelineRunNotFound,
			expectedStatus: http.StatusNotFound,
		},
		{
			name: "should return 400 when TerminateRun returns bad-request",
			terminateErr: &pipelineserver.HTTPError{
				StatusCode: http.StatusBadRequest,
				Message:    "run is not in a valid state for termination",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "should return 500 when TerminateRun returns unexpected error",
			terminateErr:   fmt.Errorf("connection refused"),
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rr := httptest.NewRecorder()
			runID := "run-abc123-def456"
			req, err := http.NewRequest(
				http.MethodPost,
				"/api/v1/pipeline-runs/"+runID+"/terminate",
				nil,
			)
			require.NoError(t, err)

			mockClient := &terminateErrorMockClient{
				MockPipelineServerClient: *psmocks.NewMockPipelineServerClient("mock://test-namespace"),
				terminateErr:             tt.terminateErr,
			}
			ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
			ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
			req = req.WithContext(ctx)
			req = withDiscoveredPipeline(req)

			params := httprouter.Params{
				httprouter.Param{Key: "runId", Value: runID},
			}

			app.TerminatePipelineRunHandler(rr, req, params)

			assert.Equal(t, tt.expectedStatus, rr.Code)
			assert.True(t, mockClient.terminateCalled, "TerminateRun should have been invoked")
			assert.Equal(t, runID, mockClient.terminateCalledFor, "TerminateRun should have been called with the correct run ID")
		})
	}
}

func TestRetryPipelineRunHandler_MutationErrors(t *testing.T) {
	app := newTestApp(t)

	tests := []struct {
		name           string
		retryErr       error
		expectedStatus int
	}{
		{
			name:           "should return 404 when RetryRun returns not-found",
			retryErr:       repositories.ErrPipelineRunNotFound,
			expectedStatus: http.StatusNotFound,
		},
		{
			name: "should return 400 when RetryRun returns bad-request",
			retryErr: &pipelineserver.HTTPError{
				StatusCode: http.StatusBadRequest,
				Message:    "run is not in a valid state for retry",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "should return 500 when RetryRun returns unexpected error",
			retryErr:       fmt.Errorf("connection refused"),
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rr := httptest.NewRecorder()
			runID := "run-abc123-def456"
			req, err := http.NewRequest(
				http.MethodPost,
				"/api/v1/pipeline-runs/"+runID+"/retry",
				nil,
			)
			require.NoError(t, err)

			mockClient := &retryErrorMockClient{
				MockPipelineServerClient: *psmocks.NewMockPipelineServerClient("mock://test-namespace"),
				retryErr:                 tt.retryErr,
			}
			ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
			ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
			req = req.WithContext(ctx)
			req = withDiscoveredPipeline(req)

			params := httprouter.Params{
				httprouter.Param{Key: "runId", Value: runID},
			}

			app.RetryPipelineRunHandler(rr, req, params)

			assert.Equal(t, tt.expectedStatus, rr.Code)
			assert.True(t, mockClient.retryCalled, "RetryRun should have been invoked")
			assert.Equal(t, runID, mockClient.retryCalledFor, "RetryRun should have been called with the correct run ID")
		})
	}
}

// TestRetryPipelineRunHandler tests the POST /api/v1/pipeline-runs/:runId/retry endpoint
func TestRetryPipelineRunHandler_Success(t *testing.T) {
	app := newTestApp(t)

	t.Run("should retry a failed pipeline run", func(t *testing.T) {
		rr := httptest.NewRecorder()
		runID := "run-abc123-def456"
		req, err := http.NewRequest(
			http.MethodPost,
			"/api/v1/pipeline-runs/"+runID+"/retry",
			nil,
		)
		require.NoError(t, err)

		mockClient := &failedRunMockClient{
			MockPipelineServerClient: *psmocks.NewMockPipelineServerClient("mock://test-namespace"),
		}
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)
		req = withDiscoveredPipeline(req)

		params := httprouter.Params{
			httprouter.Param{Key: "runId", Value: runID},
		}

		app.RetryPipelineRunHandler(rr, req, params)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, runID, mockClient.LastRetryRunID,
			"Handler should have called RetryRun with the requested runID")
	})
}

// Helper function to create a POST request for retry pipeline run handler.
func newRetryPipelineRunRequest(runID string) *http.Request {
	url := "/api/v1/pipeline-runs/" + runID + "/retry"
	req, _ := http.NewRequest(http.MethodPost, url, nil)
	return req
}

// Helper function to execute retry pipeline run handler with full context.
func executeRetryHandler(app *App, runID, namespace string, mockClient pipelineserver.PipelineServerClientInterface, withDiscoveredPipeline bool) *httptest.ResponseRecorder {
	req := newRetryPipelineRunRequest(runID)

	var discovered *repositories.DiscoveredPipeline
	if withDiscoveredPipeline {
		discovered = newMockDiscoveredPipeline(namespace)
	}

	req = setPipelineRunContext(req, mockClient, namespace, discovered)
	params := httprouter.Params{httprouter.Param{Key: "runId", Value: runID}}
	rr := httptest.NewRecorder()

	app.RetryPipelineRunHandler(rr, req, params)
	return rr
}

// TestRetryPipelineRunHandler_MissingPipelineServerClient verifies that the handler
// returns 500 when the pipeline server client is not in the request context.
func TestRetryPipelineRunHandler_MissingPipelineServerClient(t *testing.T) {
	app := newTestApp(t)
	runID := "run-test-123"

	req := newRetryPipelineRunRequest(runID)
	// Only set namespace, no pipeline server client
	ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "test-namespace")
	req = req.WithContext(ctx)

	params := httprouter.Params{httprouter.Param{Key: "runId", Value: runID}}
	rr := httptest.NewRecorder()

	app.RetryPipelineRunHandler(rr, req, params)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

// TestRetryPipelineRunHandler_EmptyRunID verifies that the handler returns 400
// when the runId parameter is empty.
func TestRetryPipelineRunHandler_EmptyRunID(t *testing.T) {
	app := newTestApp(t)
	namespace := "test-namespace"

	mockClient := psmocks.NewMockPipelineServerClient("mock://" + namespace)
	rr := executeRetryHandler(app, "", namespace, mockClient, true)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

// TestRetryPipelineRunHandler_NonExistentRunID verifies that the handler returns 404
// when the run ID does not exist in the pipeline server.
func TestRetryPipelineRunHandler_NonExistentRunID(t *testing.T) {
	app := newTestApp(t)
	namespace := "test-namespace"
	runID := "non-existent-run-id" // Special ID that triggers 404 in mock

	mockClient := psmocks.NewMockPipelineServerClient("mock://" + namespace)
	rr := executeRetryHandler(app, runID, namespace, mockClient, true)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

// TestRetryPipelineRunHandler_RunBelongsToDifferentPipeline verifies that the handler
// returns 404 when the run belongs to a different pipeline than the discovered one.
func TestRetryPipelineRunHandler_RunBelongsToDifferentPipeline(t *testing.T) {
	app := newTestApp(t)
	namespace := "test-namespace"
	runID := "run-different-pipeline"

	// Use mock client that returns a run with different pipeline ID
	mockClient := &differentPipelineMockClient{
		MockPipelineServerClient: *psmocks.NewMockPipelineServerClient("mock://" + namespace),
	}
	rr := executeRetryHandler(app, runID, namespace, mockClient, true)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

// TestRetryPipelineRunHandler_NonRetryableState verifies that the handler returns 400
// when the run is not in a retryable state (e.g., RUNNING, SUCCEEDED).
func TestRetryPipelineRunHandler_NonRetryableState(t *testing.T) {
	app := newTestApp(t)
	namespace := "test-namespace"
	runID := "run-succeeded"

	// succeededRunMockClient returns SUCCEEDED state (not retryable)
	mockClient := &succeededRunMockClient{
		MockPipelineServerClient: *psmocks.NewMockPipelineServerClient("mock://" + namespace),
	}
	rr := executeRetryHandler(app, runID, namespace, mockClient, true)

	assert.Equal(t, http.StatusBadRequest, rr.Code)

	var response struct {
		Error struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	err := json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Contains(t, response.Error.Message, "cannot be retried")
	assert.Empty(t, mockClient.LastRetryRunID,
		"RetryRun should not have been called for a non-retryable run")
}

// TestRetryPipelineRunHandler_NoDiscoveredPipeline verifies that the handler returns 404
// when there is no discovered pipeline in the request context.
func TestRetryPipelineRunHandler_NoDiscoveredPipeline(t *testing.T) {
	app := newTestApp(t)
	namespace := "test-namespace"
	runID := "run-test-123"

	mockClient := psmocks.NewMockPipelineServerClient("mock://" + namespace)
	rr := executeRetryHandler(app, runID, namespace, mockClient, false) // false = no discovered pipeline

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

// TestRetryPipelineRunHandler_NilPipelineVersionReference verifies that the handler returns 404
// when the run has a nil PipelineVersionReference (data integrity issue).
func TestRetryPipelineRunHandler_NilPipelineVersionReference(t *testing.T) {
	app := newTestApp(t)
	namespace := "test-namespace"
	runID := "run-nil-reference"

	// Use mock client that returns a run with nil PipelineVersionReference
	mockClient := &nilPipelineReferenceMockClient{
		MockPipelineServerClient: *psmocks.NewMockPipelineServerClient("mock://" + namespace),
	}
	rr := executeRetryHandler(app, runID, namespace, mockClient, true)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}
