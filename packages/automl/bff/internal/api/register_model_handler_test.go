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

var testDSPAStorage = &models.DSPAObjectStorage{
	Bucket:      "my-automl-bucket",
	EndpointURL: "https://s3.us-east-1.amazonaws.com",
	Region:      "us-east-1",
	SecretName:  "aws-connection-automl",
}

func validRegisterModelRequest() models.RegisterModelRequest {
	return models.RegisterModelRequest{
		S3Path:             "autogluon-tabular-training-pipeline/9ebab38b-4745-4b14-af99-53b7cf8515e2/autogluon-models-full-refit/3edc4d74-42cd-4be4-a09c-3096a4a2c5f8/model_artifact/LightGBMLarge_BAG_L1_FULL/predictor",
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
	ctx = context.WithValue(ctx, constants.DSPAObjectStorageKey, testDSPAStorage)
	return req.WithContext(ctx)
}

func TestRegisterModelHandler_Success(t *testing.T) {
	app := newModelRegistryTestApp()

	t.Run("registers model and returns 201 with constructed URI", func(t *testing.T) {
		req := validRegisterModelRequest()
		var capturedClient *modelregistry.MockHTTPClient
		app.modelRegistryHTTPClientFactory = func(_ *slog.Logger, _ string, _ http.Header, _ bool, _ *x509.CertPool) (modelregistry.HTTPClientInterface, error) {
			capturedClient = modelregistry.NewSuccessMockClient(req.ModelName, req.VersionName, req.ArtifactName, "")
			return capturedClient, nil
		}

		rr := httptest.NewRecorder()
		httpReq := withRegisterModelHandlerContext(newRegisterModelRequest(t, req))
		app.RegisterModelHandler(rr, httpReq, registryParams(mockDefaultModelRegistryUID))

		assert.Equal(t, http.StatusCreated, rr.Code)

		var response RegisterModelEnvelope
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotNil(t, response.Data)
		assert.NotEmpty(t, response.Data.RegisteredModelID)
		assert.NotNil(t, response.Data.ModelArtifact)
		assert.NotEmpty(t, response.Data.ModelArtifact.GetId())

		// Verify the artifact POST body contains the constructed URI with DSPA storage info
		assert.Equal(t, 3, capturedClient.PostCallCount)
		artifactBody := capturedClient.LastPostBodies[2] // 3rd POST = artifact
		assert.Contains(t, artifactBody, "s3://my-automl-bucket/")
		assert.Contains(t, artifactBody, "endpoint=")
		assert.Contains(t, artifactBody, "LightGBMLarge_BAG_L1_FULL/predictor")
	})

	t.Run("returns envelope with data field", func(t *testing.T) {
		req := validRegisterModelRequest()
		app.modelRegistryHTTPClientFactory = func(_ *slog.Logger, _ string, _ http.Header, _ bool, _ *x509.CertPool) (modelregistry.HTTPClientInterface, error) {
			return modelregistry.NewSuccessMockClient(req.ModelName, req.VersionName, req.ArtifactName, ""), nil
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
		return modelregistry.NewSuccessMockClient("m", "v1", "", ""), nil
	}

	t.Run("rejects empty registryId path param", func(t *testing.T) {
		req := validRegisterModelRequest()

		rr := httptest.NewRecorder()
		httpReq := withRegisterModelHandlerContext(newRegisterModelRequest(t, req))
		app.RegisterModelHandler(rr, httpReq, registryParams(""))

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "registryId")
	})

	t.Run("rejects empty s3 path", func(t *testing.T) {
		req := validRegisterModelRequest()
		req.S3Path = ""

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
		raw := `{"s3_path":"path/to/model","model_name":"m","version_name":"v1","unknown":"x"}`
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

	t.Run("returns 503 when DSPA storage is not available", func(t *testing.T) {
		app := newModelRegistryTestApp()
		req := validRegisterModelRequest()

		rr := httptest.NewRecorder()
		// Build context WITHOUT DSPAObjectStorageKey — handler should try
		// injectDSPAObjectStorageIfAvailable, which needs a K8s client factory.
		// Since newModelRegistryTestApp has no factory set, injection returns nil → 503.
		httpReq := newRegisterModelRequest(t, req)
		ctx := context.WithValue(httpReq.Context(), constants.NamespaceHeaderParameterKey, "test-namespace")
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &kubernetes.RequestIdentity{
			UserID: "test-user",
		})
		httpReq = httpReq.WithContext(ctx)

		app.RegisterModelHandler(rr, httpReq, registryParams(mockDefaultModelRegistryUID))

		assert.Equal(t, http.StatusServiceUnavailable, rr.Code)
		assert.Contains(t, rr.Body.String(), "DSPA object storage")
	})
}
