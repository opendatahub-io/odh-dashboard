package api

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/eval-hub/bff/internal/config"
	"github.com/opendatahub-io/eval-hub/bff/internal/constants"
	ehmocks "github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub/ehmocks"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
	"github.com/opendatahub-io/eval-hub/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEvalHubServiceHealthHandler_CRNotFound(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}

	result, response, err := setupApiTestForHealth[EvalHubServiceHealthEnvelope](
		http.MethodGet,
		EvalHubServiceHealthPath,
		identity,
		nil, // no CR found
		nil, // no error
		nil, // default mock EH client (not reached)
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.False(t, result.Data.Available)
	assert.Equal(t, EvalHubHealthStatusCRNotFound, result.Data.Status)
}

func TestEvalHubServiceHealthHandler_CRFoundButServiceUnreachable(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}

	crStatus := &models.EvalHubCRStatus{
		Name:      "evalhub",
		Namespace: "test-dashboard-ns",
		Phase:     "Ready",
		URL:       "http://evalhub.test.svc.cluster.local",
	}

	result, response, err := setupApiTestForHealth[EvalHubServiceHealthEnvelope](
		http.MethodGet,
		EvalHubServiceHealthPath,
		identity,
		crStatus,
		nil,
		&erroringEHClient{}, // service ping fails
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.False(t, result.Data.Available)
	assert.Equal(t, EvalHubHealthStatusServiceUnreachable, result.Data.Status)
}

func TestEvalHubServiceHealthHandler_Healthy(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}

	crStatus := &models.EvalHubCRStatus{
		Name:      "evalhub",
		Namespace: "test-dashboard-ns",
		Phase:     "Ready",
		URL:       "http://evalhub.test.svc.cluster.local",
	}

	result, response, err := setupApiTestForHealth[EvalHubServiceHealthEnvelope](
		http.MethodGet,
		EvalHubServiceHealthPath,
		identity,
		crStatus,
		nil,
		nil, // default mock returns healthy
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.True(t, result.Data.Available)
	assert.Equal(t, EvalHubHealthStatusHealthy, result.Data.Status)
}

func TestEvalHubServiceHealthHandler_CRDiscoveryError(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}

	discoveryErr := errors.New("kubernetes API unreachable")

	_, response, err := setupApiTestForHealth[EvalHubServiceHealthEnvelope](
		http.MethodGet,
		EvalHubServiceHealthPath,
		identity,
		nil,
		discoveryErr, // CR discovery itself fails
		nil,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusInternalServerError, response.StatusCode)
}

func TestEvalHubServiceHealthHandler_MockMode(t *testing.T) {
	// When MockEvalHubClient is true the handler returns healthy immediately,
	// bypassing CR discovery and the service ping entirely.
	// setupApiTestWithEvalHub sets MockEvalHubClient: true.
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	result, response, err := setupApiTestWithEvalHub[EvalHubServiceHealthEnvelope](
		http.MethodGet,
		EvalHubServiceHealthPath,
		nil, nil, identity, nil,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.True(t, result.Data.Available)
	assert.Equal(t, EvalHubHealthStatusHealthy, result.Data.Status)
}

// discoveryOverrideK8sClient returns a discovery URL when the expected namespace is queried.
type discoveryOverrideK8sClient struct {
	testK8sClient
	discoveryNS  string
	discoveryURL string
}

func (c *discoveryOverrideK8sClient) GetEvalHubDiscoveryURL(_ context.Context, _ *kubernetes.RequestIdentity, ns string) (string, error) {
	if ns == c.discoveryNS {
		return c.discoveryURL, nil
	}
	return "", nil
}

func (c *discoveryOverrideK8sClient) GetEvalHubCRStatus(_ context.Context, _ *kubernetes.RequestIdentity, _ string) (*models.EvalHubCRStatus, error) {
	return nil, nil
}

func TestEvalHubServiceHealthHandler_NamespaceQueryUsesConfigMapDiscovery(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}

	k8sClient := &discoveryOverrideK8sClient{
		discoveryNS:  "evalhub-test-2",
		discoveryURL: "https://evalhub.evalhub-test-tenant.svc.cluster.local:8443",
	}

	mockFactory := ehmocks.NewMockClientFactory()

	app := &App{
		config:                  config.EnvConfig{AllowedOrigins: []string{"*"}, AuthMethod: config.AuthMethodInternal},
		logger:                  testLogger,
		kubernetesClientFactory: &crStatusK8sFactory{client: k8sClient},
		evalHubClientFactory:    mockFactory,
		repositories:            repositories.NewRepositories(),
		dashboardNamespace:      "redhat-ods-applications",
	}

	req, err := http.NewRequest(http.MethodGet, EvalHubServiceHealthPath+"?namespace=evalhub-test-2", http.NoBody)
	require.NoError(t, err)
	req.Header.Set(constants.KubeflowUserIDHeader, identity.UserID)

	ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	app.Routes().ServeHTTP(rr, req)
	res := rr.Result()
	defer res.Body.Close()

	assert.Equal(t, http.StatusOK, res.StatusCode)

	var result EvalHubServiceHealthEnvelope
	data, err := io.ReadAll(res.Body)
	require.NoError(t, err)
	require.NoError(t, json.Unmarshal(data, &result))
	assert.True(t, result.Data.Available)
	assert.Equal(t, EvalHubHealthStatusHealthy, result.Data.Status)
}

func TestEvalHubServiceHealthHandler_NoNamespaceStillFallsToDashboardNS(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com", Token: "test-token"}

	// ConfigMap only exists in evalhub-test-2; no CR in dashboard NS → cr-not-found
	k8sClient := &discoveryOverrideK8sClient{
		discoveryNS:  "evalhub-test-2",
		discoveryURL: "https://evalhub.evalhub-test-tenant.svc.cluster.local:8443",
	}

	mockFactory := ehmocks.NewMockClientFactory()

	app := &App{
		config:                  config.EnvConfig{AllowedOrigins: []string{"*"}, AuthMethod: config.AuthMethodInternal},
		logger:                  testLogger,
		kubernetesClientFactory: &crStatusK8sFactory{client: k8sClient},
		evalHubClientFactory:    mockFactory,
		repositories:            repositories.NewRepositories(),
		dashboardNamespace:      "redhat-ods-applications",
	}

	// No ?namespace= param — should fall through to dashboard NS CR check (not found)
	req, err := http.NewRequest(http.MethodGet, EvalHubServiceHealthPath, http.NoBody)
	require.NoError(t, err)
	req.Header.Set(constants.KubeflowUserIDHeader, identity.UserID)

	ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	app.Routes().ServeHTTP(rr, req)
	res := rr.Result()
	defer res.Body.Close()

	assert.Equal(t, http.StatusOK, res.StatusCode)

	var result EvalHubServiceHealthEnvelope
	data, err := io.ReadAll(res.Body)
	require.NoError(t, err)
	require.NoError(t, json.Unmarshal(data, &result))
	assert.False(t, result.Data.Available)
	assert.Equal(t, EvalHubHealthStatusCRNotFound, result.Data.Status)
}
