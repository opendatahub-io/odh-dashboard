package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/automl-library/bff/internal/config"
	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/modelregistry"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/opendatahub-io/automl-library/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	"log/slog"
)

func validRegisterModelRequest() models.RegisterModelRequest {
	return models.RegisterModelRequest{
		S3Path:             "s3://my-bucket/models/model.bin",
		ModelName:          "automl-model",
		ModelDescription:   "AutoML trained model",
		VersionName:        "v1",
		VersionDescription: "Initial version",
		ModelFormatName:    "onnx",
	}
}

func newRegisterModelRequest(t *testing.T, body interface{}) *http.Request {
	t.Helper()
	b, err := json.Marshal(body)
	assert.NoError(t, err)
	req, err := http.NewRequest(http.MethodPost,
		"/api/v1/models/register?namespace=test-namespace",
		bytes.NewReader(b))
	assert.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	return req
}

func withModelRegistryClient(req *http.Request, client modelregistry.HTTPClientInterface) *http.Request {
	ctx := context.WithValue(req.Context(), constants.ModelRegistryHttpClientKey, client)
	ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
	return req.WithContext(ctx)
}

func TestRegisterModelHandler_Success(t *testing.T) {
	app := &App{
		config:       config.EnvConfig{AuthMethod: config.AuthMethodDisabled},
		logger:       slog.Default(),
		repositories: repositories.NewRepositories(slog.Default()),
	}

	t.Run("registers model and returns 201 with artifact", func(t *testing.T) {
		req := validRegisterModelRequest()
		mockClient := modelregistry.NewSuccessMockClient(req.ModelName, req.VersionName, req.S3Path)

		rr := httptest.NewRecorder()
		httpReq := withModelRegistryClient(newRegisterModelRequest(t, req), mockClient)
		app.RegisterModelHandler(rr, httpReq, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		var response RegisterModelEnvelope
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotNil(t, response.Data)
		assert.NotEmpty(t, response.Data.GetId())
		assert.Equal(t, req.S3Path, response.Data.GetUri())
	})

	t.Run("returns envelope with data field", func(t *testing.T) {
		req := validRegisterModelRequest()
		mockClient := modelregistry.NewSuccessMockClient(req.ModelName, req.VersionName, req.S3Path)

		rr := httptest.NewRecorder()
		httpReq := withModelRegistryClient(newRegisterModelRequest(t, req), mockClient)
		app.RegisterModelHandler(rr, httpReq, nil)

		var raw map[string]interface{}
		err := json.Unmarshal(rr.Body.Bytes(), &raw)
		assert.NoError(t, err)
		_, hasData := raw["data"]
		assert.True(t, hasData, "response must have 'data' field")
	})
}

func TestRegisterModelHandler_Validation(t *testing.T) {
	app := &App{
		config:       config.EnvConfig{AuthMethod: config.AuthMethodDisabled},
		logger:       slog.Default(),
		repositories: repositories.NewRepositories(slog.Default()),
	}
	mockClient := modelregistry.NewSuccessMockClient("model", "v1", "s3://b/p")

	t.Run("rejects invalid s3 path", func(t *testing.T) {
		req := validRegisterModelRequest()
		req.S3Path = "https://invalid.com/path"

		rr := httptest.NewRecorder()
		httpReq := withModelRegistryClient(newRegisterModelRequest(t, req), mockClient)
		app.RegisterModelHandler(rr, httpReq, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "s3_path")
	})

	t.Run("rejects empty model name", func(t *testing.T) {
		req := validRegisterModelRequest()
		req.ModelName = ""

		rr := httptest.NewRecorder()
		httpReq := withModelRegistryClient(newRegisterModelRequest(t, req), mockClient)
		app.RegisterModelHandler(rr, httpReq, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "model_name")
	})

	t.Run("rejects empty version name", func(t *testing.T) {
		req := validRegisterModelRequest()
		req.VersionName = ""

		rr := httptest.NewRecorder()
		httpReq := withModelRegistryClient(newRegisterModelRequest(t, req), mockClient)
		app.RegisterModelHandler(rr, httpReq, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "version_name")
	})

	t.Run("rejects malformed JSON", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost,
			"/api/v1/models/register?namespace=test-namespace",
			bytes.NewReader([]byte("{invalid")))
		req.Header.Set("Content-Type", "application/json")
		req = withModelRegistryClient(req, mockClient)

		app.RegisterModelHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("rejects unknown JSON fields", func(t *testing.T) {
		rr := httptest.NewRecorder()
		raw := `{"s3_path":"s3://b/p","model_name":"m","version_name":"v1","unknown":"x"}`
		req, _ := http.NewRequest(http.MethodPost,
			"/api/v1/models/register?namespace=test-namespace",
			bytes.NewReader([]byte(raw)))
		req.Header.Set("Content-Type", "application/json")
		req = withModelRegistryClient(req, mockClient)

		app.RegisterModelHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "unknown")
	})
}

func TestRegisterModelHandler_ErrorCases(t *testing.T) {
	app := &App{
		config:       config.EnvConfig{AuthMethod: config.AuthMethodDisabled},
		logger:       slog.Default(),
		repositories: repositories.NewRepositories(slog.Default()),
	}

	t.Run("returns 503 when model registry client not in context", func(t *testing.T) {
		req := validRegisterModelRequest()
		rr := httptest.NewRecorder()
		httpReq := newRegisterModelRequest(t, req)
		ctx := context.WithValue(httpReq.Context(), constants.NamespaceHeaderParameterKey, "test-namespace")
		httpReq = httpReq.WithContext(ctx)
		// No ModelRegistryHttpClientKey in context

		app.RegisterModelHandler(rr, httpReq, nil)

		assert.Equal(t, http.StatusServiceUnavailable, rr.Code)
		assert.Contains(t, rr.Body.String(), "model registry")
	})

	t.Run("propagates HTTP error from model registry API", func(t *testing.T) {
		req := validRegisterModelRequest()
		mockClient := modelregistry.NewFailingMockClient(409, "409", "model name already exists")

		rr := httptest.NewRecorder()
		httpReq := withModelRegistryClient(newRegisterModelRequest(t, req), mockClient)
		app.RegisterModelHandler(rr, httpReq, nil)

		assert.Equal(t, 409, rr.Code)
		var errResp struct {
			Error struct {
				Code    string `json:"code"`
				Message string `json:"message"`
			} `json:"error"`
		}
		err := json.Unmarshal(rr.Body.Bytes(), &errResp)
		assert.NoError(t, err)
		assert.Equal(t, "409", errResp.Error.Code)
		assert.Contains(t, errResp.Error.Message, "already exists")
	})
}
