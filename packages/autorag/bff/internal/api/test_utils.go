package api

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/config"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	k8mocks "github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes/k8mocks"
	psmocks "github.com/opendatahub-io/autorag-library/bff/internal/integrations/pipelineserver/psmocks"
	s3mocks "github.com/opendatahub-io/autorag-library/bff/internal/integrations/s3/s3mocks"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
)

// setupApiTest is a minimal helper to exercise remaining handlers (user, namespaces, healthcheck)
func setupApiTest[T any](method, url string, body interface{}, k8Factory kubernetes.KubernetesClientFactory, identity *kubernetes.RequestIdentity) (T, *http.Response, error) {
	var empty T
	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return empty, nil, err
		}
		reqBody = bytes.NewReader(b)
	}
	if reqBody == nil {
		reqBody = http.NoBody
	}
	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return empty, nil, err
	}

	// Inject headers expected by middleware for internal auth
	if identity != nil && identity.UserID != "" {
		req.Header.Set(constants.KubeflowUserIDHeader, identity.UserID)
	}

	// Create a test logger that discards output
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{}))

	app := &App{
		config: config.EnvConfig{
			AllowedOrigins: []string{"*"},
			AuthMethod:     config.AuthMethodInternal,
			// PipelineServerURL bypasses DSPA discovery in AttachPipelineServerClient so
			// tests using custom k8s mocks that don't implement the DSPA CRD still work.
			// DSPAObjectStorageKey will NOT be set in context for these tests.
			PipelineServerURL: "http://test-pipeline-server",
		},
		logger:                      logger,
		kubernetesClientFactory:     k8Factory,
		pipelineServerClientFactory: psmocks.NewMockClientFactory(),
		s3ClientFactory:             s3mocks.NewMockClientFactory(),
		repositories:                repositories.NewRepositories(logger),
	}

	ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	app.Routes().ServeHTTP(rr, req)
	res := rr.Result()
	defer res.Body.Close()
	data, err := io.ReadAll(res.Body)
	if err != nil {
		return empty, nil, err
	}
	if len(data) == 0 {
		return empty, res, nil
	}
	var out T
	if err := json.Unmarshal(data, &out); err != nil && err != io.EOF {
		return empty, nil, err
	}
	return out, res, nil
}

// newTestApp creates a test app with mocked Kubernetes client for unit testing
func newTestApp(t *testing.T) *App {
	t.Helper()

	logger := slog.Default()
	cfg := config.EnvConfig{
		MockK8Client: true,
		AuthMethod:   config.AuthMethodInternal,
	}

	// Create a mock Kubernetes client factory
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)

	testEnv, clientset, err := k8mocks.SetupEnvTest(k8mocks.TestEnvInput{
		Logger: logger,
		Ctx:    ctx,
		Cancel: cancel,
	})
	if err != nil {
		t.Fatalf("failed to setup test environment: %v", err)
	}
	t.Cleanup(func() {
		if testEnv != nil {
			_ = testEnv.Stop()
		}
	})

	k8sFactory, err := k8mocks.NewMockedKubernetesClientFactory(clientset, testEnv, cfg, logger)
	if err != nil {
		t.Fatalf("failed to create mock k8s factory: %v", err)
	}

	// Create a mock Pipeline Server client factory
	psFactory := psmocks.NewMockClientFactory()

	return NewTestApp(cfg, logger, k8sFactory, psFactory, nil)
}

// setupApiTestPostMultipart builds a POST request with multipart/form-data containing a file part
// and serves it through the app. Returns the response. Caller should close res.Body.
func setupApiTestPostMultipart(
	url string,
	fileContent []byte,
	fileName string,
	k8Factory kubernetes.KubernetesClientFactory,
	identity *kubernetes.RequestIdentity,
) (*http.Response, error) {
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	part, err := w.CreateFormFile("file", fileName)
	if err != nil {
		return nil, err
	}
	if _, err := part.Write(fileContent); err != nil {
		return nil, err
	}
	if err := w.Close(); err != nil {
		return nil, err
	}

	req, err := http.NewRequest(http.MethodPost, url, &buf)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", w.FormDataContentType())
	if identity != nil && identity.UserID != "" {
		req.Header.Set(constants.KubeflowUserIDHeader, identity.UserID)
	}

	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{}))
	app := &App{
		config: config.EnvConfig{
			AllowedOrigins: []string{"*"},
			AuthMethod:     config.AuthMethodInternal,
			// PipelineServerURL bypasses DSPA discovery in AttachPipelineServerClient so
			// tests using custom k8s mocks that don't implement the DSPA CRD still work.
			// DSPAObjectStorageKey will NOT be set in context for these tests.
			PipelineServerURL: "http://test-pipeline-server",
		},
		logger:                      logger,
		kubernetesClientFactory:     k8Factory,
		pipelineServerClientFactory: psmocks.NewMockClientFactory(),
		s3ClientFactory:             s3mocks.NewMockClientFactory(),
		repositories:                repositories.NewRepositories(logger),
	}
	ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	app.Routes().ServeHTTP(rr, req)
	return rr.Result(), nil
}
