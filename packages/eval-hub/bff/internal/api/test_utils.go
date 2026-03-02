package api

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"

	"github.com/opendatahub-io/eval-hub/bff/internal/config"
	"github.com/opendatahub-io/eval-hub/bff/internal/constants"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
	ehmocks "github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub/ehmocks"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/eval-hub/bff/internal/repositories"
	corev1 "k8s.io/api/core/v1"
)

var testLogger = slog.New(slog.NewTextHandler(io.Discard, nil))

// setupApiTestWithEvalHub exercises handlers that require an EvalHub client in context.
func setupApiTestWithEvalHub[T any](method, url string, body interface{}, k8Factory kubernetes.KubernetesClientFactory, identity *kubernetes.RequestIdentity, ehClient evalhub.EvalHubClientInterface) (T, *http.Response, error) {
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

	if identity != nil && identity.UserID != "" {
		req.Header.Set(constants.KubeflowUserIDHeader, identity.UserID)
	}

	if k8Factory == nil {
		k8Factory = &testK8sFactory{}
	}

	mockFactory := ehmocks.NewMockClientFactory()
	if ehClient != nil {
		mockFactory.SetMockClient(ehClient)
	}

	app := &App{
		config:                  config.EnvConfig{AllowedOrigins: []string{"*"}, AuthMethod: config.AuthMethodInternal, EvalHubURL: "http://mock-evalhub:8080", MockEvalHubClient: true},
		logger:                  testLogger,
		kubernetesClientFactory: k8Factory,
		evalHubClientFactory:    mockFactory,
		repositories:            repositories.NewRepositories(),
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

// testK8sFactory is a minimal K8s factory for unit tests that extracts identity from kubeflow headers.
type testK8sFactory struct{}

func (f *testK8sFactory) GetClient(_ context.Context) (kubernetes.KubernetesClientInterface, error) {
	return &testK8sClient{}, nil
}

func (f *testK8sFactory) ExtractRequestIdentity(h http.Header) (*kubernetes.RequestIdentity, error) {
	userID := h.Get(constants.KubeflowUserIDHeader)
	if userID == "" {
		userID = "test-user@example.com"
	}
	return &kubernetes.RequestIdentity{UserID: userID}, nil
}

func (f *testK8sFactory) ValidateRequestIdentity(identity *kubernetes.RequestIdentity) error {
	return nil
}

// testK8sClient is a minimal implementation of KubernetesClientInterface for unit tests.
// It allows all EvalHub access checks and returns safe zero values for unused methods.
type testK8sClient struct{}

func (c *testK8sClient) GetNamespaces(_ context.Context, _ *kubernetes.RequestIdentity) ([]corev1.Namespace, error) {
	return nil, nil
}

func (c *testK8sClient) IsClusterAdmin(_ *kubernetes.RequestIdentity) (bool, error) {
	return false, nil
}

func (c *testK8sClient) GetUser(_ *kubernetes.RequestIdentity) (string, error) {
	return "test-user@example.com", nil
}

func (c *testK8sClient) CanListEvalHubInstances(_ context.Context, _ *kubernetes.RequestIdentity, _ string) (bool, error) {
	return true, nil
}

func (c *testK8sClient) GetEvalHubServiceURL(_ context.Context, _ *kubernetes.RequestIdentity, _ string) (string, error) {
	return "http://mock-evalhub:8080", nil
}

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

	if identity != nil && identity.UserID != "" {
		req.Header.Set(constants.KubeflowUserIDHeader, identity.UserID)
	}

	if k8Factory == nil {
		k8Factory = &testK8sFactory{}
	}

	app := &App{
		config:                  config.EnvConfig{AllowedOrigins: []string{"*"}, AuthMethod: config.AuthMethodInternal, EvalHubURL: "http://mock-evalhub:8080"},
		logger:                  testLogger,
		kubernetesClientFactory: k8Factory,
		evalHubClientFactory:    ehmocks.NewMockClientFactory(),
		repositories:            repositories.NewRepositories(),
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
