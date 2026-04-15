package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/pipelineserver/psmocks"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/opendatahub-io/automl-library/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// withDiscoveredPipelinesAutoML adds both AutoML discovered pipelines to the request context.
// Uses the version IDs that the mock client returns in namespace mode so that both pipelines
// contribute runs when GetAllPipelineRuns filters by PipelineVersionID.
func withDiscoveredPipelinesAutoML(req *http.Request) *http.Request {
	tsIDs := psmocks.DeriveMockIDs("test-namespace")
	tabIDs := psmocks.DeriveTabularMockIDs("test-namespace")
	pipelines := map[string]*repositories.DiscoveredPipeline{
		constants.PipelineTypeTimeSeries: {
			PipelineID:        tsIDs.PipelineID,
			PipelineVersionID: tsIDs.LatestVersionID,
			PipelineName:      "autogluon-timeseries-training-pipeline",
			Namespace:         "test-namespace",
		},
		constants.PipelineTypeTabular: {
			PipelineID:        tabIDs.PipelineID,
			PipelineVersionID: tabIDs.LatestVersionID,
			PipelineName:      "autogluon-tabular-training-pipeline",
			Namespace:         "test-namespace",
		},
	}
	ctx := context.WithValue(req.Context(), constants.DiscoveredPipelinesKey, pipelines)
	return req.WithContext(ctx)
}

func TestPipelineRunsHandler_Success(t *testing.T) {
	app := newTestApp(t)

	t.Run("should return pipeline runs from all discovered pipelines", func(t *testing.T) {
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
		req = withDiscoveredPipelinesAutoML(req)

		app.PipelineRunsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response PipelineRunsEnvelope
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		assert.NotNil(t, response.Data)
		// Mock test-namespace returns 4 base runs: 3 timeseries + 1 tabular.
		// Both discovered pipelines contribute runs to the merged result.
		assert.Len(t, response.Data.Runs, 4, "Should return merged runs from both discovered pipelines")
		assert.Equal(t, int32(4), response.Data.TotalSize)

		// Verify runs from both pipeline types are present in the merged result
		tsVersionID := psmocks.DeriveMockIDs("test-namespace").LatestVersionID
		tabVersionID := psmocks.DeriveTabularMockIDs("test-namespace").LatestVersionID
		foundTimeseries, foundTabular := false, false
		for _, run := range response.Data.Runs {
			if run.PipelineVersionReference != nil {
				if run.PipelineVersionReference.PipelineVersionID == tsVersionID {
					foundTimeseries = true
					assert.Equal(t, constants.PipelineTypeTimeSeries, run.PipelineType,
						"timeseries run %s should have pipeline_type=%s", run.RunID, constants.PipelineTypeTimeSeries)
				}
				if run.PipelineVersionReference.PipelineVersionID == tabVersionID {
					foundTabular = true
					assert.Equal(t, constants.PipelineTypeTabular, run.PipelineType,
						"tabular run %s should have pipeline_type=%s", run.RunID, constants.PipelineTypeTabular)
				}
			}
		}
		assert.True(t, foundTimeseries, "at least one timeseries pipeline run should be present")
		assert.True(t, foundTabular, "at least one tabular pipeline run should be present")
	})

	t.Run("should handle pagination with page parameter", func(t *testing.T) {
		rr1 := httptest.NewRecorder()
		req1, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs?namespace=test-namespace&pageSize=2&page=1",
			nil,
		)
		assert.NoError(t, err)

		mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")
		ctx := context.WithValue(req1.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		req1 = req1.WithContext(ctx)
		req1 = withDiscoveredPipelinesAutoML(req1)

		app.PipelineRunsHandler(rr1, req1, nil)
		assert.Equal(t, http.StatusOK, rr1.Code)

		var page1Response PipelineRunsEnvelope
		err = json.Unmarshal(rr1.Body.Bytes(), &page1Response)
		assert.NoError(t, err)
		assert.NotNil(t, page1Response.Data)
		// Page 1 of pageSize=2 should return exactly 2 runs
		assert.Len(t, page1Response.Data.Runs, 2)
		// TotalSize should reflect total across all pipelines (3 timeseries + 1 tabular)
		assert.Equal(t, int32(4), page1Response.Data.TotalSize)

		rr2 := httptest.NewRecorder()
		req2, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs?namespace=test-namespace&pageSize=2&page=2",
			nil,
		)
		assert.NoError(t, err)

		mockClient2 := psmocks.NewMockPipelineServerClient("mock://test-namespace")
		ctx2 := context.WithValue(req2.Context(), constants.PipelineServerClientKey, mockClient2)
		ctx2 = context.WithValue(ctx2, constants.NamespaceHeaderParameterKey, "test-namespace")
		req2 = req2.WithContext(ctx2)
		req2 = withDiscoveredPipelinesAutoML(req2)

		app.PipelineRunsHandler(rr2, req2, nil)
		assert.Equal(t, http.StatusOK, rr2.Code)

		var page2Response PipelineRunsEnvelope
		err = json.Unmarshal(rr2.Body.Bytes(), &page2Response)
		assert.NoError(t, err)
		assert.NotNil(t, page2Response.Data)
		assert.Len(t, page2Response.Data.Runs, 2)
		assert.Equal(t, int32(4), page2Response.Data.TotalSize)

		// Pages must be disjoint
		page1IDs := make(map[string]bool)
		for _, run := range page1Response.Data.Runs {
			page1IDs[run.RunID] = true
		}
		for _, run := range page2Response.Data.Runs {
			assert.False(t, page1IDs[run.RunID], "run %q appears on both page 1 and page 2", run.RunID)
		}

		// Each page must be sorted by created_at descending
		for _, pageResp := range []PipelineRunsEnvelope{page1Response, page2Response} {
			for i := 1; i < len(pageResp.Data.Runs); i++ {
				assert.GreaterOrEqual(t, pageResp.Data.Runs[i-1].CreatedAt, pageResp.Data.Runs[i].CreatedAt,
					"runs should be sorted by created_at descending")
			}
		}
	})

	t.Run("should handle page 2 pagination", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs?namespace=test-namespace&pageSize=2&page=2",
			nil,
		)
		assert.NoError(t, err)

		mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)
		req = withDiscoveredPipelinesAutoML(req)

		app.PipelineRunsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response PipelineRunsEnvelope
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotNil(t, response.Data)
		// Page 2 of pageSize=2 with 4 total runs should return 2 runs (indices 2-3)
		assert.Len(t, response.Data.Runs, 2)
		assert.Equal(t, int32(4), response.Data.TotalSize)
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

	t.Run("should return empty runs list when no AutoML pipelines discovered", func(t *testing.T) {
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
		// Empty pipelines map — no AutoML pipelines discovered
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

	t.Run("should reject invalid pageSize", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs?namespace=test-namespace&pageSize=notanumber",
			nil,
		)
		assert.NoError(t, err)

		mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)
		req = withDiscoveredPipelinesAutoML(req)

		app.PipelineRunsHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("should reject pageSize exceeding maximum", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs?namespace=test-namespace&pageSize=101",
			nil,
		)
		assert.NoError(t, err)

		mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)
		req = withDiscoveredPipelinesAutoML(req)

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

		mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)
		req = withDiscoveredPipelinesAutoML(req)

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
		req = withDiscoveredPipelinesAutoML(req)

		app.PipelineRunsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response struct {
			Data models.PipelineRunsData `json:"data"`
		}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)

		assert.Greater(t, len(response.Data.Runs), 0, "Should have at least one run")
		for i, run := range response.Data.Runs {
			// Verify required fields
			assert.NotEmpty(t, run.RunID, "Runs[%d] RunID should not be empty", i)
			assert.NotEmpty(t, run.DisplayName, "Runs[%d] DisplayName should not be empty", i)
			assert.NotEmpty(t, run.State, "Runs[%d] State should not be empty", i)
			assert.NotEmpty(t, run.CreatedAt, "Runs[%d] CreatedAt should not be empty", i)

			// Verify enhanced fields are present
			assert.NotEmpty(t, run.ExperimentID, "Runs[%d] ExperimentID should not be empty", i)
			assert.NotNil(t, run.PipelineVersionReference, "Runs[%d] PipelineVersionReference should not be nil", i)
			if run.PipelineVersionReference != nil {
				assert.NotEmpty(t, run.PipelineVersionReference.PipelineID, "Runs[%d] PipelineID should not be empty", i)
				assert.NotEmpty(t, run.PipelineVersionReference.PipelineVersionID, "Runs[%d] PipelineVersionID should not be empty", i)
			}
			assert.NotEmpty(t, run.StorageState, "Runs[%d] StorageState should not be empty", i)
			assert.NotEmpty(t, run.ServiceAccount, "Runs[%d] ServiceAccount should not be empty", i)

			// Verify state history is present
			assert.NotNil(t, run.StateHistory, "Runs[%d] StateHistory should not be nil", i)
			assert.Greater(t, len(run.StateHistory), 0, "Runs[%d] StateHistory should have at least one entry", i)
			if len(run.StateHistory) > 0 {
				assert.NotEmpty(t, run.StateHistory[0].UpdateTime, "Runs[%d] StateHistory UpdateTime should not be empty", i)
				assert.NotEmpty(t, run.StateHistory[0].State, "Runs[%d] StateHistory State should not be empty", i)
			}

			// Verify run details are present
			assert.NotNil(t, run.RunDetails, "Runs[%d] RunDetails should not be nil", i)

			// Verify pipeline_type is one of the known AutoML types
			assert.Contains(t, []string{constants.PipelineTypeTimeSeries, constants.PipelineTypeTabular}, run.PipelineType,
				"Runs[%d] pipeline_type should be timeseries or tabular", i)
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
		req = withDiscoveredPipelinesAutoML(req)

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

		// Attach mock client and discovered pipelines to context
		mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)
		req = withDiscoveredPipelinesAutoML(req)

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
		req = req.WithContext(ctx)
		req = withDiscoveredPipelinesAutoML(req)

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
		req = req.WithContext(ctx)
		req = withDiscoveredPipelinesAutoML(req)

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

		// Verify pipeline_type is set to a known AutoML type
		assert.Contains(t, []string{constants.PipelineTypeTimeSeries, constants.PipelineTypeTabular}, run.PipelineType,
			"pipeline_type should be timeseries or tabular")
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
		req = req.WithContext(ctx)
		req = withDiscoveredPipelinesAutoML(req)

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
		req = req.WithContext(ctx)
		req = withDiscoveredPipelinesAutoML(req)

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
		req = req.WithContext(ctx)
		req = withDiscoveredPipelinesAutoML(req)

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
}
