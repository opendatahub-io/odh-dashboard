package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/pipelineserver/psmocks"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
)

func TestPipelineRunsHandler_Success(t *testing.T) {
	app := newTestApp(t)

	t.Run("should return pipeline runs with mock client", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs?namespace=test-namespace&pipelineServerId=dspa",
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

	t.Run("should filter by annotations", func(t *testing.T) {
		rr := httptest.NewRecorder()
		annotationsJSON := `{"autorag.opendatahub.io/experiment-id":"exp-123"}`
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs?namespace=test-namespace&pipelineServerId=dspa&annotations="+annotationsJSON,
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
	})

	t.Run("should handle pagination parameters", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs?namespace=test-namespace&pipelineServerId=dspa&pageSize=10&nextPageToken=token123",
			nil,
		)
		assert.NoError(t, err)

		mockClient := psmocks.NewMockPipelineServerClient()
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)

		app.PipelineRunsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
	})

	t.Run("should extract annotations from runtime config", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs?namespace=test-namespace&pipelineServerId=dspa",
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

		// Verify that annotations were extracted from runtime config
		if len(response.Data.Runs) > 0 {
			firstRun := response.Data.Runs[0]
			assert.NotNil(t, firstRun.Annotations)
			// Mock data should have annotations with "annotation_" prefix in runtime config
			// which should be extracted and included in the response
		}
	})
}

func TestPipelineRunsHandler_ErrorCases(t *testing.T) {
	app := newTestApp(t)

	t.Run("should fail without pipeline server client in context", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs?namespace=test-namespace&pipelineServerId=dspa",
			nil,
		)
		assert.NoError(t, err)

		// Don't attach client to context
		ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)

		app.PipelineRunsHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("should fail with invalid annotations JSON", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs?namespace=test-namespace&pipelineServerId=dspa&annotations=invalid-json",
			nil,
		)
		assert.NoError(t, err)

		mockClient := psmocks.NewMockPipelineServerClient()
		ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, mockClient)
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
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
			"/api/v1/pipeline-runs?namespace=test-namespace&pipelineServerId=dspa",
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

		dataMap := dataField.(map[string]interface{})
		_, hasRuns := dataMap["runs"]
		assert.True(t, hasRuns, "Data should have 'runs' field")

		_, hasTotalSize := dataMap["total_size"]
		assert.True(t, hasTotalSize, "Data should have 'total_size' field")
	})

	t.Run("should include required fields in pipeline run objects", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(
			http.MethodGet,
			"/api/v1/pipeline-runs?namespace=test-namespace&pipelineServerId=dspa",
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
			assert.NotEmpty(t, run.RunID, "RunID should not be empty")
			assert.NotEmpty(t, run.DisplayName, "DisplayName should not be empty")
			assert.NotEmpty(t, run.State, "State should not be empty")
			assert.NotEmpty(t, run.CreatedAt, "CreatedAt should not be empty")
		}
	})
}
