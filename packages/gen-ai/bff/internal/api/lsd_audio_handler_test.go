package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/responses"
	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	k8s "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockK8sClientForASR implements KubernetesClientInterface with configurable AAModels
type mockK8sClientForASR struct {
	k8s.KubernetesClientInterface
	models []models.AAModel
	err    error
}

func (m *mockK8sClientForASR) GetAAModels(_ context.Context, _ *integrations.RequestIdentity, _ string) ([]models.AAModel, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.models, nil
}

// mockK8sFactoryForASR implements KubernetesClientFactory
type mockK8sFactoryForASR struct {
	client *mockK8sClientForASR
}

func (f *mockK8sFactoryForASR) GetClient(_ context.Context) (k8s.KubernetesClientInterface, error) {
	return f.client, nil
}

func (f *mockK8sFactoryForASR) ExtractRequestIdentity(_ http.Header) (*integrations.RequestIdentity, error) {
	return &integrations.RequestIdentity{Token: "test-token"}, nil
}

func (f *mockK8sFactoryForASR) ValidateRequestIdentity(_ *integrations.RequestIdentity) error {
	return nil
}

// mockLSClientForASR implements LlamaStackClientInterface for audio handler tests.
// Only GetFileContent is used; other methods panic if called.
type mockLSClientForASR struct {
	fileBody        io.ReadCloser
	fileContentType string
	fileErr         error
}

func (m *mockLSClientForASR) GetFileContent(_ context.Context, _ string) (io.ReadCloser, string, error) {
	if m.fileErr != nil {
		return nil, "", m.fileErr
	}
	return m.fileBody, m.fileContentType, nil
}

func (m *mockLSClientForASR) ListModels(_ context.Context) ([]openai.Model, error) {
	return nil, nil
}
func (m *mockLSClientForASR) ListVectorStores(_ context.Context, _ llamastack.ListVectorStoresParams) ([]openai.VectorStore, error) {
	return nil, nil
}
func (m *mockLSClientForASR) CreateVectorStore(_ context.Context, _ llamastack.CreateVectorStoreParams) (*openai.VectorStore, error) {
	return nil, nil
}
func (m *mockLSClientForASR) DeleteVectorStore(_ context.Context, _ string) error { return nil }
func (m *mockLSClientForASR) UploadFile(_ context.Context, _ llamastack.UploadFileParams) (*llamastack.FileUploadResult, error) {
	return nil, nil
}
func (m *mockLSClientForASR) ListFiles(_ context.Context, _ llamastack.ListFilesParams) ([]openai.FileObject, error) {
	return nil, nil
}
func (m *mockLSClientForASR) GetFile(_ context.Context, _ string) (*openai.FileObject, error) {
	return nil, nil
}
func (m *mockLSClientForASR) DeleteFile(_ context.Context, _ string) error { return nil }
func (m *mockLSClientForASR) ListVectorStoreFiles(_ context.Context, _ string, _ llamastack.ListVectorStoreFilesParams) ([]openai.VectorStoreFile, error) {
	return nil, nil
}
func (m *mockLSClientForASR) GetVectorStoreFile(_ context.Context, _, _ string) (*openai.VectorStoreFile, error) {
	return nil, nil
}
func (m *mockLSClientForASR) DeleteVectorStoreFile(_ context.Context, _, _ string) error {
	return nil
}
func (m *mockLSClientForASR) CreateResponse(_ context.Context, _ llamastack.CreateResponseParams) (*responses.Response, error) {
	return nil, nil
}
func (m *mockLSClientForASR) CreateResponseStream(_ context.Context, _ llamastack.CreateResponseParams) (llamastack.ResponseStreamIterator, error) {
	return nil, nil
}
func (m *mockLSClientForASR) CreateResponseStreamRaw(_ context.Context, _ map[string]interface{}) (llamastack.ResponseStreamIterator, error) {
	return nil, nil
}
func (m *mockLSClientForASR) GetResponse(_ context.Context, _ string) (*responses.Response, error) {
	return nil, nil
}

func newTestAppForASR(t *testing.T, k8sModels []models.AAModel) *App {
	t.Helper()

	originalWd, err := os.Getwd()
	require.NoError(t, err)
	projectRoot := filepath.Join(originalWd, "..", "..")
	require.NoError(t, os.Chdir(projectRoot))
	t.Cleanup(func() { _ = os.Chdir(originalWd) })

	cfg := config.EnvConfig{
		Port:            4000,
		APIPathPrefix:   "/api/v1",
		StaticAssetsDir: "static",
		AuthMethod:      config.AuthMethodUser,
		AuthTokenHeader: config.DefaultAuthTokenHeader,
		AuthTokenPrefix: config.DefaultAuthTokenPrefix,
		MockLSClient:    true,
		MockK8sClient:   true,
	}

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))

	openAPIHandler, err := NewOpenAPIHandler(logger)
	require.NoError(t, err)

	mockK8s := &mockK8sClientForASR{models: k8sModels}

	app := &App{
		config:                  cfg,
		logger:                  logger,
		kubernetesClientFactory: &mockK8sFactoryForASR{client: mockK8s},
		openAPI:                 openAPIHandler,
	}

	return app
}

func asrModel(namespace string) models.AAModel {
	return models.AAModel{
		ModelName:       "whisper-asr",
		ModelID:         "whisper-asr",
		ServingRuntime:  "vLLM",
		APIProtocol:     "REST",
		Description:     "Whisper Large V3 Turbo",
		Usecase:         "Audio transcription",
		Endpoints:       []string{fmt.Sprintf("internal: http://whisper-asr.%s.svc.cluster.local:80", namespace)},
		Status:          models.ModelStatusRunning,
		DisplayName:     "Whisper ASR",
		ModelSourceType: models.ModelSourceTypeNamespace,
		Capabilities:    []string{constants.CapabilityAudioTranscription},
	}
}

func buildAudioRequest(t *testing.T, body AudioTranscriptionRequest, lsClient llamastack.LlamaStackClientInterface) *http.Request {
	t.Helper()
	jsonBody, err := json.Marshal(body)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, constants.AudioTranscriptionsPath+"?namespace=test-ns", bytes.NewReader(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	ctx := req.Context()
	ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "test-ns")
	ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{Token: "test-token"})
	if lsClient != nil {
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, lsClient)
	}

	return req.WithContext(ctx)
}

func wavBytes() []byte {
	return []byte("RIFF\x00\x00\x00\x00WAVEfmt \x10\x00\x00\x00")
}

func mp3Bytes() []byte {
	mp3Data := make([]byte, 20)
	mp3Data[0] = 0xFF
	mp3Data[1] = 0xFB
	copy(mp3Data[2:], []byte("mp3audiodata123456"))
	return mp3Data
}

func mockLSWithAudio(data []byte, contentType string) *mockLSClientForASR {
	return &mockLSClientForASR{
		fileBody:        io.NopCloser(bytes.NewReader(data)),
		fileContentType: contentType,
	}
}

func mockLSWithError(err error) *mockLSClientForASR {
	return &mockLSClientForASR{fileErr: err}
}

// frontendError is the test representation of the FrontendErrorResponse JSON shape
type frontendError struct {
	Error struct {
		Component string `json:"component"`
		Code      string `json:"code"`
		Message   string `json:"message"`
		Retriable bool   `json:"retriable"`
	} `json:"error"`
}

func parseFrontendError(t *testing.T, body []byte) frontendError {
	t.Helper()
	var fe frontendError
	require.NoError(t, json.Unmarshal(body, &fe))
	return fe
}

// --- Validation Tests ---

func TestAudioTranscription_MissingFileID(t *testing.T) {
	app := newTestAppForASR(t, nil)

	req := buildAudioRequest(t, AudioTranscriptionRequest{FileID: "", ASRModelID: "whisper-asr"}, nil)
	rr := httptest.NewRecorder()
	app.LlamaStackAudioTranscriptionHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "file_id is required")
}

func TestAudioTranscription_InvalidFileID(t *testing.T) {
	app := newTestAppForASR(t, nil)

	req := buildAudioRequest(t, AudioTranscriptionRequest{FileID: "not-a-valid-id", ASRModelID: "whisper-asr"}, nil)
	rr := httptest.NewRecorder()
	app.LlamaStackAudioTranscriptionHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "file_id")
}

func TestAudioTranscription_MissingASRModelID(t *testing.T) {
	app := newTestAppForASR(t, nil)

	req := buildAudioRequest(t, AudioTranscriptionRequest{FileID: "file-abc123", ASRModelID: ""}, nil)
	rr := httptest.NewRecorder()
	app.LlamaStackAudioTranscriptionHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "asr_model_id is required")
}

func TestAudioTranscription_EmptyBody(t *testing.T) {
	app := newTestAppForASR(t, nil)

	req := httptest.NewRequest(http.MethodPost, constants.AudioTranscriptionsPath+"?namespace=test-ns", strings.NewReader(""))
	req.Header.Set("Content-Type", "application/json")
	ctx := req.Context()
	ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "test-ns")
	ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{Token: "test-token"})
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	app.LlamaStackAudioTranscriptionHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

// --- Model Resolution Tests ---

func TestAudioTranscription_ModelNotFound(t *testing.T) {
	app := newTestAppForASR(t, []models.AAModel{})
	lsClient := mockLSWithAudio(wavBytes(), "audio/wav")

	req := buildAudioRequest(t, AudioTranscriptionRequest{FileID: "file-abc123", ASRModelID: "nonexistent"}, lsClient)
	rr := httptest.NewRecorder()
	app.LlamaStackAudioTranscriptionHandler(rr, req, nil)

	assert.Equal(t, http.StatusNotFound, rr.Code)
	fe := parseFrontendError(t, rr.Body.Bytes())
	assert.Equal(t, "asr", fe.Error.Component)
	assert.Equal(t, constants.ASRCodeModelNotFound, fe.Error.Code)
	assert.Contains(t, fe.Error.Message, "not found")
	assert.False(t, fe.Error.Retriable)
}

func TestAudioTranscription_ModelLacksCapability(t *testing.T) {
	model := asrModel("test-ns")
	model.Capabilities = []string{constants.CapabilityTextGeneration}
	app := newTestAppForASR(t, []models.AAModel{model})
	lsClient := mockLSWithAudio(wavBytes(), "audio/wav")

	req := buildAudioRequest(t, AudioTranscriptionRequest{FileID: "file-abc123", ASRModelID: "whisper-asr"}, lsClient)
	rr := httptest.NewRecorder()
	app.LlamaStackAudioTranscriptionHandler(rr, req, nil)

	assert.Equal(t, http.StatusNotFound, rr.Code)
	fe := parseFrontendError(t, rr.Body.Bytes())
	assert.Equal(t, "asr", fe.Error.Component)
	assert.Equal(t, constants.ASRCodeModelInvalid, fe.Error.Code)
	assert.Contains(t, fe.Error.Message, "does not have audio-transcription capability")
	assert.False(t, fe.Error.Retriable)
}

func TestAudioTranscription_SSRFPreventionCustomEndpoint(t *testing.T) {
	model := asrModel("test-ns")
	model.ModelSourceType = models.ModelSourceTypeCustomEndpoint
	app := newTestAppForASR(t, []models.AAModel{model})
	lsClient := mockLSWithAudio(wavBytes(), "audio/wav")

	req := buildAudioRequest(t, AudioTranscriptionRequest{FileID: "file-abc123", ASRModelID: "whisper-asr"}, lsClient)
	rr := httptest.NewRecorder()
	app.LlamaStackAudioTranscriptionHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	fe := parseFrontendError(t, rr.Body.Bytes())
	assert.Equal(t, "asr", fe.Error.Component)
	assert.Equal(t, constants.ASRCodeModelInvalid, fe.Error.Code)
	assert.Contains(t, fe.Error.Message, "namespace-deployed model")
	assert.False(t, fe.Error.Retriable)
}

func TestAudioTranscription_ModelNotRunning(t *testing.T) {
	model := asrModel("test-ns")
	model.Status = models.ModelStatusStop
	app := newTestAppForASR(t, []models.AAModel{model})
	lsClient := mockLSWithAudio(wavBytes(), "audio/wav")

	req := buildAudioRequest(t, AudioTranscriptionRequest{FileID: "file-abc123", ASRModelID: "whisper-asr"}, lsClient)
	rr := httptest.NewRecorder()
	app.LlamaStackAudioTranscriptionHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	fe := parseFrontendError(t, rr.Body.Bytes())
	assert.Equal(t, "asr", fe.Error.Component)
	assert.Equal(t, constants.ASRCodeModelNotRunning, fe.Error.Code)
	assert.Contains(t, fe.Error.Message, "not running")
	assert.True(t, fe.Error.Retriable)
}

func TestAudioTranscription_ModelNoInternalEndpoint(t *testing.T) {
	model := asrModel("test-ns")
	model.Endpoints = []string{"external: https://external.example.com"}
	app := newTestAppForASR(t, []models.AAModel{model})
	lsClient := mockLSWithAudio(wavBytes(), "audio/wav")

	req := buildAudioRequest(t, AudioTranscriptionRequest{FileID: "file-abc123", ASRModelID: "whisper-asr"}, lsClient)
	rr := httptest.NewRecorder()
	app.LlamaStackAudioTranscriptionHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	fe := parseFrontendError(t, rr.Body.Bytes())
	assert.Equal(t, "asr", fe.Error.Component)
	assert.Equal(t, constants.ASRCodeModelNoEndpoint, fe.Error.Code)
	assert.Contains(t, fe.Error.Message, "no internal endpoint")
	assert.False(t, fe.Error.Retriable)
}

// --- GetFileContent Error Tests ---

func TestAudioTranscription_GetFileContentError(t *testing.T) {
	model := asrModel("test-ns")
	app := newTestAppForASR(t, []models.AAModel{model})
	lsClient := mockLSWithError(errors.New("file not found: 404"))

	req := buildAudioRequest(t, AudioTranscriptionRequest{FileID: "file-abc123", ASRModelID: "whisper-asr"}, lsClient)
	rr := httptest.NewRecorder()
	app.LlamaStackAudioTranscriptionHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadGateway, rr.Code)
	fe := parseFrontendError(t, rr.Body.Bytes())
	assert.Equal(t, "asr", fe.Error.Component)
	assert.Equal(t, constants.ASRCodeFileRetrieval, fe.Error.Code)
	assert.Contains(t, fe.Error.Message, "file not found")
	assert.True(t, fe.Error.Retriable)
}

func TestAudioTranscription_GetFileContentServerError(t *testing.T) {
	model := asrModel("test-ns")
	app := newTestAppForASR(t, []models.AAModel{model})
	lsClient := mockLSWithError(errors.New("OGX file retrieval failed: 500"))

	req := buildAudioRequest(t, AudioTranscriptionRequest{FileID: "file-abc123", ASRModelID: "whisper-asr"}, lsClient)
	rr := httptest.NewRecorder()
	app.LlamaStackAudioTranscriptionHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadGateway, rr.Code)
	fe := parseFrontendError(t, rr.Body.Bytes())
	assert.Equal(t, "asr", fe.Error.Component)
	assert.Equal(t, constants.ASRCodeFileRetrieval, fe.Error.Code)
	assert.Contains(t, fe.Error.Message, "500")
	assert.True(t, fe.Error.Retriable)
}

func TestAudioTranscription_MissingLSClient(t *testing.T) {
	model := asrModel("test-ns")
	app := newTestAppForASR(t, []models.AAModel{model})

	// Explicitly no LlamaStackClientKey in context
	req := buildAudioRequest(t, AudioTranscriptionRequest{FileID: "file-abc123", ASRModelID: "whisper-asr"}, nil)
	rr := httptest.NewRecorder()
	app.LlamaStackAudioTranscriptionHandler(rr, req, nil)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

// --- Audio Format Validation Tests ---

func TestAudioTranscription_InvalidAudioFormat(t *testing.T) {
	model := asrModel("test-ns")
	app := newTestAppForASR(t, []models.AAModel{model})
	lsClient := mockLSWithAudio([]byte("this is not audio content at all"), "application/octet-stream")

	req := buildAudioRequest(t, AudioTranscriptionRequest{FileID: "file-abc123", ASRModelID: "whisper-asr"}, lsClient)
	rr := httptest.NewRecorder()
	app.LlamaStackAudioTranscriptionHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "unsupported audio format")
}

// --- Success Tests ---

func TestAudioTranscription_Success_WAV(t *testing.T) {
	asrServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPost, r.Method)
		assert.True(t, strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/form-data"))
		assert.Equal(t, "Bearer test-token", r.Header.Get("Authorization"))

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]string{"text": "Hello world transcription"})
	}))
	defer asrServer.Close()

	model := asrModel("test-ns")
	model.Endpoints = []string{"internal: " + asrServer.URL}
	app := newTestAppForASR(t, []models.AAModel{model})
	lsClient := mockLSWithAudio(wavBytes(), "audio/wav")

	req := buildAudioRequest(t, AudioTranscriptionRequest{FileID: "file-abc123", ASRModelID: "whisper-asr"}, lsClient)
	rr := httptest.NewRecorder()
	app.LlamaStackAudioTranscriptionHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var resp AudioTranscriptionResponse
	err := json.Unmarshal(rr.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, "Hello world transcription", resp.Text)
}

func TestAudioTranscription_Success_MP3(t *testing.T) {
	asrServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]string{"text": "MP3 transcription result"})
	}))
	defer asrServer.Close()

	model := asrModel("test-ns")
	model.Endpoints = []string{"internal: " + asrServer.URL}
	app := newTestAppForASR(t, []models.AAModel{model})
	lsClient := mockLSWithAudio(mp3Bytes(), "audio/mpeg")

	req := buildAudioRequest(t, AudioTranscriptionRequest{FileID: "file-abc123", ASRModelID: "whisper-asr"}, lsClient)
	rr := httptest.NewRecorder()
	app.LlamaStackAudioTranscriptionHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var resp AudioTranscriptionResponse
	err := json.Unmarshal(rr.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, "MP3 transcription result", resp.Text)
}

// --- ASR Endpoint Error Tests ---

func TestAudioTranscription_ASREndpointAuthFailure(t *testing.T) {
	asrServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer asrServer.Close()

	model := asrModel("test-ns")
	model.Endpoints = []string{"internal: " + asrServer.URL}
	app := newTestAppForASR(t, []models.AAModel{model})
	lsClient := mockLSWithAudio(wavBytes(), "audio/wav")

	req := buildAudioRequest(t, AudioTranscriptionRequest{FileID: "file-abc123", ASRModelID: "whisper-asr"}, lsClient)
	rr := httptest.NewRecorder()
	app.LlamaStackAudioTranscriptionHandler(rr, req, nil)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
	fe := parseFrontendError(t, rr.Body.Bytes())
	assert.Equal(t, "asr", fe.Error.Component)
	assert.Equal(t, constants.ASRCodeAuthFailed, fe.Error.Code)
	assert.Contains(t, fe.Error.Message, "authentication failed")
	assert.False(t, fe.Error.Retriable)
}

func TestAudioTranscription_ASREndpointServerError(t *testing.T) {
	asrServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer asrServer.Close()

	model := asrModel("test-ns")
	model.Endpoints = []string{"internal: " + asrServer.URL}
	app := newTestAppForASR(t, []models.AAModel{model})
	lsClient := mockLSWithAudio(wavBytes(), "audio/wav")

	req := buildAudioRequest(t, AudioTranscriptionRequest{FileID: "file-abc123", ASRModelID: "whisper-asr"}, lsClient)
	rr := httptest.NewRecorder()
	app.LlamaStackAudioTranscriptionHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadGateway, rr.Code)
	fe := parseFrontendError(t, rr.Body.Bytes())
	assert.Equal(t, "asr", fe.Error.Component)
	assert.Equal(t, constants.ASRCodeServiceError, fe.Error.Code)
	assert.Contains(t, fe.Error.Message, "ASR endpoint returned status 500")
	assert.True(t, fe.Error.Retriable)
}

func TestAudioTranscription_ASREmptyTranscription(t *testing.T) {
	asrServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]string{"text": "   "})
	}))
	defer asrServer.Close()

	model := asrModel("test-ns")
	model.Endpoints = []string{"internal: " + asrServer.URL}
	app := newTestAppForASR(t, []models.AAModel{model})
	lsClient := mockLSWithAudio(wavBytes(), "audio/wav")

	req := buildAudioRequest(t, AudioTranscriptionRequest{FileID: "file-abc123", ASRModelID: "whisper-asr"}, lsClient)
	rr := httptest.NewRecorder()
	app.LlamaStackAudioTranscriptionHandler(rr, req, nil)

	assert.Equal(t, http.StatusUnprocessableEntity, rr.Code)
	fe := parseFrontendError(t, rr.Body.Bytes())
	assert.Equal(t, "asr", fe.Error.Component)
	assert.Equal(t, constants.ASRCodeNoSpeech, fe.Error.Code)
	assert.Contains(t, fe.Error.Message, "No speech detected")
	assert.False(t, fe.Error.Retriable)
}

func TestAudioTranscription_ASRInvalidJSON(t *testing.T) {
	asrServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("not valid json"))
	}))
	defer asrServer.Close()

	model := asrModel("test-ns")
	model.Endpoints = []string{"internal: " + asrServer.URL}
	app := newTestAppForASR(t, []models.AAModel{model})
	lsClient := mockLSWithAudio(wavBytes(), "audio/wav")

	req := buildAudioRequest(t, AudioTranscriptionRequest{FileID: "file-abc123", ASRModelID: "whisper-asr"}, lsClient)
	rr := httptest.NewRecorder()
	app.LlamaStackAudioTranscriptionHandler(rr, req, nil)

	assert.Equal(t, http.StatusBadGateway, rr.Code)
	fe := parseFrontendError(t, rr.Body.Bytes())
	assert.Equal(t, "asr", fe.Error.Component)
	assert.Equal(t, constants.ASRCodeInvalidResponse, fe.Error.Code)
	assert.Contains(t, fe.Error.Message, "invalid JSON")
	assert.True(t, fe.Error.Retriable)
}

func TestAudioTranscription_ASRTimeout(t *testing.T) {
	asrServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(3 * time.Second)
		w.WriteHeader(http.StatusOK)
	}))
	defer asrServer.Close()

	model := asrModel("test-ns")
	model.Endpoints = []string{"internal: " + asrServer.URL}
	app := newTestAppForASR(t, []models.AAModel{model})
	lsClient := mockLSWithAudio(wavBytes(), "audio/wav")

	req := buildAudioRequest(t, AudioTranscriptionRequest{FileID: "file-abc123", ASRModelID: "whisper-asr"}, lsClient)
	ctx, cancel := context.WithTimeout(req.Context(), 500*time.Millisecond)
	defer cancel()
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	app.LlamaStackAudioTranscriptionHandler(rr, req, nil)

	assert.Equal(t, http.StatusGatewayTimeout, rr.Code)
	fe := parseFrontendError(t, rr.Body.Bytes())
	assert.Equal(t, "asr", fe.Error.Component)
	assert.Equal(t, constants.ASRCodeTimeout, fe.Error.Code)
	assert.True(t, fe.Error.Retriable)
}

// --- ASR_MODEL_URL Override Tests ---

func TestAudioTranscription_AsrModelURLOverride(t *testing.T) {
	// Start a mock ASR server that records incoming requests
	asrServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPost, r.Method)
		assert.True(t, strings.HasPrefix(r.URL.Path, "/v1/audio/transcriptions"))

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]string{"text": "override transcription"})
	}))
	defer asrServer.Close()

	// Model has NO internal endpoint — without override this would fail
	model := asrModel("test-ns")
	model.Endpoints = []string{"external: https://external.example.com"}
	app := newTestAppForASR(t, []models.AAModel{model})
	app.config.AsrModelURL = asrServer.URL

	lsClient := mockLSWithAudio(wavBytes(), "audio/wav")
	req := buildAudioRequest(t, AudioTranscriptionRequest{FileID: "file-abc123", ASRModelID: "whisper-asr"}, lsClient)
	rr := httptest.NewRecorder()
	app.LlamaStackAudioTranscriptionHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var resp AudioTranscriptionResponse
	err := json.Unmarshal(rr.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, "override transcription", resp.Text)
}

func TestAudioTranscription_AsrModelURLOverrideIgnoresInternalEndpoint(t *testing.T) {
	// The override URL should be used instead of the model's internal endpoint
	overrideServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]string{"text": "from override server"})
	}))
	defer overrideServer.Close()

	// Model has a valid internal endpoint, but override should take precedence
	model := asrModel("test-ns")
	model.Endpoints = []string{"internal: http://should-not-be-used.svc.cluster.local:80"}
	app := newTestAppForASR(t, []models.AAModel{model})
	app.config.AsrModelURL = overrideServer.URL

	lsClient := mockLSWithAudio(wavBytes(), "audio/wav")
	req := buildAudioRequest(t, AudioTranscriptionRequest{FileID: "file-abc123", ASRModelID: "whisper-asr"}, lsClient)
	rr := httptest.NewRecorder()
	app.LlamaStackAudioTranscriptionHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var resp AudioTranscriptionResponse
	err := json.Unmarshal(rr.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, "from override server", resp.Text)
}

func TestAudioTranscription_AsrModelURLEmptyUsesInternalEndpoint(t *testing.T) {
	// When AsrModelURL is empty, the normal internal endpoint should be used
	internalServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]string{"text": "from internal endpoint"})
	}))
	defer internalServer.Close()

	model := asrModel("test-ns")
	model.Endpoints = []string{"internal: " + internalServer.URL}
	app := newTestAppForASR(t, []models.AAModel{model})
	// Explicitly leave AsrModelURL empty (default)

	lsClient := mockLSWithAudio(wavBytes(), "audio/wav")
	req := buildAudioRequest(t, AudioTranscriptionRequest{FileID: "file-abc123", ASRModelID: "whisper-asr"}, lsClient)
	rr := httptest.NewRecorder()
	app.LlamaStackAudioTranscriptionHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	var resp AudioTranscriptionResponse
	err := json.Unmarshal(rr.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, "from internal endpoint", resp.Text)
}

// --- Unit Tests for Helper Functions ---

func TestValidateAudioMagicBytes_WAV(t *testing.T) {
	wavData := []byte("RIFF\x00\x00\x00\x00WAVEfmt extra data here")
	reader, err := validateAudioMagicBytes(bytes.NewReader(wavData))
	require.NoError(t, err)
	assert.NotNil(t, reader)
}

func TestValidateAudioMagicBytes_MP3(t *testing.T) {
	mp3Data := make([]byte, 20)
	mp3Data[0] = 0xFF
	mp3Data[1] = 0xFB
	reader, err := validateAudioMagicBytes(bytes.NewReader(mp3Data))
	require.NoError(t, err)
	assert.NotNil(t, reader)
}

func TestValidateAudioMagicBytes_ID3TaggedMP3(t *testing.T) {
	id3Header := []byte("ID3\x04\x00\x00\x00\x00\x00\x00\x00\x00")
	reader, err := validateAudioMagicBytes(bytes.NewReader(id3Header))
	require.NoError(t, err)
	assert.NotNil(t, reader)
}

func TestValidateAudioMagicBytes_Invalid(t *testing.T) {
	_, err := validateAudioMagicBytes(bytes.NewReader([]byte("INVALID HEADER DATA")))
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "unsupported audio format")
}

func TestValidateAudioMagicBytes_TooSmall(t *testing.T) {
	_, err := validateAudioMagicBytes(bytes.NewReader([]byte("AB")))
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "too small")
}

func TestExtractInternalEndpoint(t *testing.T) {
	endpoints := []string{
		"internal: http://model.ns.svc.cluster.local:8080",
		"external: https://model-ns.example.com",
	}
	assert.Equal(t, "http://model.ns.svc.cluster.local:8080", extractInternalEndpoint(endpoints))
}

func TestExtractInternalEndpoint_NoInternalReturnsEmpty(t *testing.T) {
	endpoints := []string{
		"external: https://model-ns.example.com",
	}
	assert.Equal(t, "", extractInternalEndpoint(endpoints))
}

func TestExtractInternalEndpoint_Empty(t *testing.T) {
	assert.Equal(t, "", extractInternalEndpoint([]string{}))
}
