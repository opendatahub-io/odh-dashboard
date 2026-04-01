package api

import (
	"bytes"
	"context"
	"crypto/x509"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/modelregistry"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
)

// mockDefaultModelRegistryUID matches getMockModelRegistries() in the repository.
const mockDefaultModelRegistryUID = "a1b2c3d4-e5f6-7890-abcd-111111111111"

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

func registryParams(registryId string) httprouter.Params {
	return httprouter.Params{{Key: "registryId", Value: registryId}}
}

func newRegisterModelRequest(t *testing.T, body interface{}) *http.Request {
	t.Helper()
	b, err := json.Marshal(body)
	assert.NoError(t, err)
	req, err := http.NewRequest(http.MethodPost,
		"/api/v1/model-registries/"+mockDefaultModelRegistryUID+"/models?namespace=test-namespace",
		bytes.NewReader(b))
	assert.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	return req
}

func withRegisterModelHandlerContext(req *http.Request) *http.Request {
	ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "test-namespace")
	ctx = context.WithValue(ctx, constants.RequestIdentityKey, &kubernetes.RequestIdentity{
		UserID: "test-user",
	})
	return req.WithContext(ctx)
}

func TestRegisterModelHandler_Success(t *testing.T) {
	app := newModelRegistryTestApp()

	t.Run("registers model and returns 201 with artifact", func(t *testing.T) {
		req := validRegisterModelRequest()
		app.modelRegistryHTTPClientFactory = func(_ *slog.Logger, _ string, _ http.Header, _ bool, _ *x509.CertPool) (modelregistry.HTTPClientInterface, error) {
			return modelregistry.NewSuccessMockClient(req.ModelName, req.VersionName, req.S3Path), nil
		}

		rr := httptest.NewRecorder()
		httpReq := withRegisterModelHandlerContext(newRegisterModelRequest(t, req))
		app.RegisterModelHandler(rr, httpReq, registryParams(mockDefaultModelRegistryUID))

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
		app.modelRegistryHTTPClientFactory = func(_ *slog.Logger, _ string, _ http.Header, _ bool, _ *x509.CertPool) (modelregistry.HTTPClientInterface, error) {
			return modelregistry.NewSuccessMockClient(req.ModelName, req.VersionName, req.S3Path), nil
		}

		rr := httptest.NewRecorder()
		httpReq := withRegisterModelHandlerContext(newRegisterModelRequest(t, req))
		app.RegisterModelHandler(rr, httpReq, registryParams(mockDefaultModelRegistryUID))

		var raw map[string]interface{}
		err := json.Unmarshal(rr.Body.Bytes(), &raw)
		assert.NoError(t, err)
		_, hasData := raw["data"]
		assert.True(t, hasData, "response must have 'data' field")
	})
}

func TestRegisterModelHandler_Validation(t *testing.T) {
	app := newModelRegistryTestApp()
	app.modelRegistryHTTPClientFactory = func(_ *slog.Logger, _ string, _ http.Header, _ bool, _ *x509.CertPool) (modelregistry.HTTPClientInterface, error) {
		return modelregistry.NewSuccessMockClient("m", "v1", "s3://b/p"), nil
	}

	t.Run("rejects empty registryId path param", func(t *testing.T) {
		req := validRegisterModelRequest()

		rr := httptest.NewRecorder()
		httpReq := withRegisterModelHandlerContext(newRegisterModelRequest(t, req))
		app.RegisterModelHandler(rr, httpReq, registryParams(""))

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "registryId")
	})

	t.Run("rejects invalid s3 path", func(t *testing.T) {
		req := validRegisterModelRequest()
		req.S3Path = "https://invalid.com/path"

		rr := httptest.NewRecorder()
		httpReq := withRegisterModelHandlerContext(newRegisterModelRequest(t, req))
		app.RegisterModelHandler(rr, httpReq, registryParams(mockDefaultModelRegistryUID))

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "s3_path")
	})

	t.Run("rejects empty model name", func(t *testing.T) {
		req := validRegisterModelRequest()
		req.ModelName = ""

		rr := httptest.NewRecorder()
		httpReq := withRegisterModelHandlerContext(newRegisterModelRequest(t, req))
		app.RegisterModelHandler(rr, httpReq, registryParams(mockDefaultModelRegistryUID))

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "model_name")
	})

	t.Run("rejects empty version name", func(t *testing.T) {
		req := validRegisterModelRequest()
		req.VersionName = ""

		rr := httptest.NewRecorder()
		httpReq := withRegisterModelHandlerContext(newRegisterModelRequest(t, req))
		app.RegisterModelHandler(rr, httpReq, registryParams(mockDefaultModelRegistryUID))

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "version_name")
	})

	t.Run("rejects malformed JSON", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost,
			"/api/v1/model-registries/"+mockDefaultModelRegistryUID+"/models?namespace=test-namespace",
			bytes.NewReader([]byte("{invalid")))
		req.Header.Set("Content-Type", "application/json")
		req = withRegisterModelHandlerContext(req)

		app.RegisterModelHandler(rr, req, registryParams(mockDefaultModelRegistryUID))

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("rejects unknown JSON fields", func(t *testing.T) {
		rr := httptest.NewRecorder()
		raw := `{"s3_path":"s3://b/p","model_name":"m","version_name":"v1","unknown":"x"}`
		req, _ := http.NewRequest(http.MethodPost,
			"/api/v1/model-registries/"+mockDefaultModelRegistryUID+"/models?namespace=test-namespace",
			bytes.NewReader([]byte(raw)))
		req.Header.Set("Content-Type", "application/json")
		req = withRegisterModelHandlerContext(req)

		app.RegisterModelHandler(rr, req, registryParams(mockDefaultModelRegistryUID))

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "unknown")
	})
}

func TestRegisterModelHandler_ErrorCases(t *testing.T) {
	t.Run("returns 400 when RequestIdentity missing", func(t *testing.T) {
		app := newModelRegistryTestApp()
		req := validRegisterModelRequest()
		rr := httptest.NewRecorder()
		httpReq := newRegisterModelRequest(t, req)
		ctx := context.WithValue(httpReq.Context(), constants.NamespaceHeaderParameterKey, "test-namespace")
		httpReq = httpReq.WithContext(ctx)

		app.RegisterModelHandler(rr, httpReq, registryParams(mockDefaultModelRegistryUID))

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "RequestIdentity")
	})

	t.Run("returns 404 when registryId unknown", func(t *testing.T) {
		app := newModelRegistryTestApp()
		req := validRegisterModelRequest()

		rr := httptest.NewRecorder()
		httpReq := withRegisterModelHandlerContext(newRegisterModelRequest(t, req))
		app.RegisterModelHandler(rr, httpReq, registryParams("00000000-0000-0000-0000-000000000000"))

		assert.Equal(t, http.StatusNotFound, rr.Code)
		assert.Contains(t, rr.Body.String(), "registryId")
	})

	t.Run("propagates HTTP error from model registry API", func(t *testing.T) {
		app := newModelRegistryTestApp()
		req := validRegisterModelRequest()
		app.modelRegistryHTTPClientFactory = func(_ *slog.Logger, _ string, _ http.Header, _ bool, _ *x509.CertPool) (modelregistry.HTTPClientInterface, error) {
			return modelregistry.NewFailingMockClient(409, "409", "model name already exists"), nil
		}

		rr := httptest.NewRecorder()
		httpReq := withRegisterModelHandlerContext(newRegisterModelRequest(t, req))
		app.RegisterModelHandler(rr, httpReq, registryParams(mockDefaultModelRegistryUID))

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
