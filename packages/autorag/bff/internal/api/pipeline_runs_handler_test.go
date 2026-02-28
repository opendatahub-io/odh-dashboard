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
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

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
		mockClient := psmocks.NewMockPipelineServerClient()
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)

		app.PipelineRunsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response PipelineRunsEnvelope
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		assert.NotNil(t, response.Data)
		assert.Len(t, response.Data.Runs, 3, "Should return 3 pipeline runs from mock")
		assert.Equal(t, int32(3), response.Data.TotalSize)
	})

	t.Run("should filter by pipeline version ID", func(t *testing.T) {
		rr := httptest.NewRecorder()
		pipelineVersionID := "22e57c06-030f-4c63-900d-0a808d577899"
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs?namespace=test-namespace&pipelineVersionId="+pipelineVersionID,
			nil,
		)
		assert.NoError(t, err)

		mockClient := psmocks.NewMockPipelineServerClient()
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)

		app.PipelineRunsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response PipelineRunsEnvelope
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotNil(t, response.Data)

		// Verify the filter parameter was passed to the client
		require.NotNil(t, mockClient.LastListRunsParams, "Handler should have called ListRuns")
		assert.Contains(t, mockClient.LastListRunsParams.Filter, "pipeline_version_id",
			"Filter should include pipeline_version_id key")
		assert.Contains(t, mockClient.LastListRunsParams.Filter, pipelineVersionID,
			"Filter should include the requested pipeline version ID")
	})

	t.Run("should handle pagination parameters", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs?namespace=test-namespace&pageSize=10&nextPageToken=token123",
			nil,
		)
		assert.NoError(t, err)

		mockClient := psmocks.NewMockPipelineServerClient()
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)

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

		assert.Equal(t, http.StatusBadRequest, rr.Code)
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

		mockClient := psmocks.NewMockPipelineServerClient()
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)

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

		mockClient := psmocks.NewMockPipelineServerClient()
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)

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
		}
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

		// Attach mock client to context
		mockClient := psmocks.NewMockPipelineServerClient()
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
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

		mockClient := psmocks.NewMockPipelineServerClient()
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
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

		mockClient := psmocks.NewMockPipelineServerClient()
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
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

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("should fail with empty runId", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs/",
			nil,
		)
		require.NoError(t, err)

		mockClient := psmocks.NewMockPipelineServerClient()
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
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
}
