package api

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/config"
	"github.com/opendatahub-io/eval-hub/bff/internal/constants"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

// namespaceAwareCRClient returns different CR statuses depending on the namespace queried.
type namespaceAwareCRClient struct {
	testK8sClient
	crByNamespace    map[string]*models.EvalHubCRStatus
	errByNS          map[string]error
	discoveryByNS    map[string]string
	discoveryErrByNS map[string]error
}

func (c *namespaceAwareCRClient) GetEvalHubCRStatus(_ context.Context, _ *kubernetes.RequestIdentity, namespace string) (*models.EvalHubCRStatus, error) {
	if c.errByNS != nil {
		if err, ok := c.errByNS[namespace]; ok {
			return nil, err
		}
	}
	if c.crByNamespace != nil {
		return c.crByNamespace[namespace], nil
	}
	return nil, nil
}

func (c *namespaceAwareCRClient) GetEvalHubDiscoveryURL(_ context.Context, _ *kubernetes.RequestIdentity, namespace string) (string, error) {
	if c.discoveryErrByNS != nil {
		if err, ok := c.discoveryErrByNS[namespace]; ok {
			return "", err
		}
	}
	if c.discoveryByNS != nil {
		return c.discoveryByNS[namespace], nil
	}
	return "", nil
}

func newTestApp(k8sClient kubernetes.KubernetesClientInterface, dashboardNS string) *App {
	return &App{
		config:                  config.EnvConfig{AuthMethod: config.AuthMethodInternal},
		logger:                  testLogger,
		kubernetesClientFactory: &crStatusK8sFactory{client: k8sClient},
		dashboardNamespace:      dashboardNS,
	}
}

func TestEvalHubServiceURL_UserNamespaceHasCR(t *testing.T) {
	client := &namespaceAwareCRClient{
		crByNamespace: map[string]*models.EvalHubCRStatus{
			"user-project": {
				Name: "evalhub", Namespace: "user-project", Phase: "Ready",
				URL: "http://evalhub.user-project.svc:8080",
			},
			"redhat-ods-applications": {
				Name: "evalhub", Namespace: "redhat-ods-applications", Phase: "Ready",
				URL: "http://evalhub.platform.svc:8080",
			},
		},
	}

	app := newTestApp(client, "redhat-ods-applications")
	ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, &kubernetes.RequestIdentity{UserID: "user@test.com", Token: "tok"})
	ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "user-project")

	serviceURL, authToken, crNotFound, err := app.evalHubServiceURL(ctx)

	require.NoError(t, err)
	assert.False(t, crNotFound)
	assert.Equal(t, "http://evalhub.user-project.svc:8080", serviceURL)
	assert.Equal(t, "tok", authToken)
}

func TestEvalHubServiceURL_FallbackToDashboardNamespace(t *testing.T) {
	client := &namespaceAwareCRClient{
		crByNamespace: map[string]*models.EvalHubCRStatus{
			"redhat-ods-applications": {
				Name: "evalhub", Namespace: "redhat-ods-applications", Phase: "Ready",
				URL: "http://evalhub.platform.svc:8080",
			},
		},
	}

	app := newTestApp(client, "redhat-ods-applications")
	ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, &kubernetes.RequestIdentity{UserID: "user@test.com", Token: "tok"})
	ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "user-project")

	serviceURL, _, crNotFound, err := app.evalHubServiceURL(ctx)

	require.NoError(t, err)
	assert.False(t, crNotFound)
	assert.Equal(t, "http://evalhub.platform.svc:8080", serviceURL)
}

func TestEvalHubServiceURL_CRNotFoundAnywhere(t *testing.T) {
	client := &namespaceAwareCRClient{
		crByNamespace: map[string]*models.EvalHubCRStatus{},
	}

	app := newTestApp(client, "redhat-ods-applications")
	ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, &kubernetes.RequestIdentity{UserID: "user@test.com", Token: "tok"})
	ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "user-project")

	serviceURL, _, crNotFound, err := app.evalHubServiceURL(ctx)

	require.NoError(t, err)
	assert.True(t, crNotFound)
	assert.Empty(t, serviceURL)
}

func TestEvalHubServiceURL_NoUserNamespaceInContext(t *testing.T) {
	client := &namespaceAwareCRClient{
		crByNamespace: map[string]*models.EvalHubCRStatus{
			"opendatahub": {
				Name: "evalhub", Namespace: "opendatahub", Phase: "Ready",
				URL: "http://evalhub.odh.svc:8080",
			},
		},
	}

	app := newTestApp(client, "opendatahub")
	ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, &kubernetes.RequestIdentity{UserID: "user@test.com", Token: "tok"})

	serviceURL, _, crNotFound, err := app.evalHubServiceURL(ctx)

	require.NoError(t, err)
	assert.False(t, crNotFound)
	assert.Equal(t, "http://evalhub.odh.svc:8080", serviceURL)
}

func TestEvalHubServiceURL_ForbiddenInUserNS_FallsThroughToDashboard(t *testing.T) {
	forbiddenErr := k8serrors.NewForbidden(
		schema.GroupResource{Group: "trustyai.opendatahub.io", Resource: "evalhubs"},
		"", fmt.Errorf("user cannot list evalhubs"),
	)
	client := &namespaceAwareCRClient{
		errByNS: map[string]error{
			"user-project": fmt.Errorf("failed to list EvalHub CRs: %w", forbiddenErr),
		},
		crByNamespace: map[string]*models.EvalHubCRStatus{
			"redhat-ods-applications": {
				Name: "evalhub", Namespace: "redhat-ods-applications", Phase: "Ready",
				URL: "http://evalhub.platform.svc:8080",
			},
		},
	}

	app := newTestApp(client, "redhat-ods-applications")
	ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, &kubernetes.RequestIdentity{UserID: "user@test.com", Token: "tok"})
	ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "user-project")

	serviceURL, _, crNotFound, err := app.evalHubServiceURL(ctx)

	require.NoError(t, err)
	assert.False(t, crNotFound)
	assert.Equal(t, "http://evalhub.platform.svc:8080", serviceURL)
}

func TestEvalHubServiceURL_ForbiddenInUserNS_NoCRAnywhere(t *testing.T) {
	forbiddenErr := k8serrors.NewForbidden(
		schema.GroupResource{Group: "trustyai.opendatahub.io", Resource: "evalhubs"},
		"", fmt.Errorf("user cannot list evalhubs"),
	)
	client := &namespaceAwareCRClient{
		errByNS: map[string]error{
			"user-project": fmt.Errorf("failed to list EvalHub CRs: %w", forbiddenErr),
		},
		crByNamespace: map[string]*models.EvalHubCRStatus{},
	}

	app := newTestApp(client, "redhat-ods-applications")
	ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, &kubernetes.RequestIdentity{UserID: "user@test.com", Token: "tok"})
	ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "user-project")

	serviceURL, _, crNotFound, err := app.evalHubServiceURL(ctx)

	require.NoError(t, err)
	assert.True(t, crNotFound)
	assert.Empty(t, serviceURL)
}

func TestEvalHubServiceURL_OperationalErrorInUserNS_SurfacedImmediately(t *testing.T) {
	client := &namespaceAwareCRClient{
		errByNS: map[string]error{
			"user-project": fmt.Errorf("failed to create dynamic client: connection refused"),
		},
		crByNamespace: map[string]*models.EvalHubCRStatus{
			"redhat-ods-applications": {
				Name: "evalhub", Namespace: "redhat-ods-applications", Phase: "Ready",
				URL: "http://evalhub.platform.svc:8080",
			},
		},
	}

	app := newTestApp(client, "redhat-ods-applications")
	ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, &kubernetes.RequestIdentity{UserID: "user@test.com", Token: "tok"})
	ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "user-project")

	_, _, _, err := app.evalHubServiceURL(ctx)

	require.Error(t, err)
	assert.Contains(t, err.Error(), "user-project")
	assert.Contains(t, err.Error(), "connection refused")
}

func TestEvalHubServiceURL_EnvOverrideBypassesCRDiscovery(t *testing.T) {
	client := &namespaceAwareCRClient{}

	app := newTestApp(client, "redhat-ods-applications")
	app.config.EvalHubURL = "http://override:9090"
	ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, &kubernetes.RequestIdentity{UserID: "user@test.com", Token: "tok"})
	ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "user-project")

	serviceURL, _, crNotFound, err := app.evalHubServiceURL(ctx)

	require.NoError(t, err)
	assert.False(t, crNotFound)
	assert.Equal(t, "http://override:9090", serviceURL)
}

func TestEvalHubServiceURL_DiscoveryConfigMapResolvesURL(t *testing.T) {
	client := &namespaceAwareCRClient{
		discoveryByNS: map[string]string{
			"team-a": "https://evalhub.evalhub-ns.svc.cluster.local",
		},
		crByNamespace: map[string]*models.EvalHubCRStatus{
			"redhat-ods-applications": {
				Name: "evalhub", Namespace: "redhat-ods-applications", Phase: "Ready",
				URL: "http://evalhub.platform.svc:8080",
			},
		},
	}

	app := newTestApp(client, "redhat-ods-applications")
	ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, &kubernetes.RequestIdentity{UserID: "user@test.com", Token: "tok"})
	ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "team-a")

	serviceURL, authToken, crNotFound, err := app.evalHubServiceURL(ctx)

	require.NoError(t, err)
	assert.False(t, crNotFound)
	assert.Equal(t, "https://evalhub.evalhub-ns.svc.cluster.local", serviceURL)
	assert.Equal(t, "tok", authToken)
}

func TestEvalHubServiceURL_DiscoveryConfigMapNotFound_FallsThroughToCR(t *testing.T) {
	client := &namespaceAwareCRClient{
		discoveryByNS: map[string]string{},
		crByNamespace: map[string]*models.EvalHubCRStatus{
			"team-a": {
				Name: "evalhub", Namespace: "team-a", Phase: "Ready",
				URL: "http://evalhub.team-a.svc:8080",
			},
		},
	}

	app := newTestApp(client, "redhat-ods-applications")
	ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, &kubernetes.RequestIdentity{UserID: "user@test.com", Token: "tok"})
	ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "team-a")

	serviceURL, _, crNotFound, err := app.evalHubServiceURL(ctx)

	require.NoError(t, err)
	assert.False(t, crNotFound)
	assert.Equal(t, "http://evalhub.team-a.svc:8080", serviceURL)
}

func TestEvalHubServiceURL_DiscoveryConfigMapError_SurfacedImmediately(t *testing.T) {
	client := &namespaceAwareCRClient{
		discoveryErrByNS: map[string]error{
			"team-a": fmt.Errorf("failed to read evalhub-discovery ConfigMap: network timeout"),
		},
	}

	app := newTestApp(client, "redhat-ods-applications")
	ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, &kubernetes.RequestIdentity{UserID: "user@test.com", Token: "tok"})
	ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "team-a")

	_, _, _, err := app.evalHubServiceURL(ctx)

	require.Error(t, err)
	assert.Contains(t, err.Error(), "team-a")
	assert.Contains(t, err.Error(), "network timeout")
}

func TestAttachNamespace_ValidNamespace(t *testing.T) {
	tests := []struct {
		name      string
		namespace string
		wantCode  int
	}{
		{"simple name", "my-project", http.StatusOK},
		{"single char", "a", http.StatusOK},
		{"max length", "a234567890123456789012345678901234567890123456789012345678901ab", http.StatusOK},
		{"with numbers", "ns-123-test", http.StatusOK},
		{"empty", "", http.StatusBadRequest},
		{"uppercase", "My-Project", http.StatusBadRequest},
		{"starts with dash", "-invalid", http.StatusBadRequest},
		{"ends with dash", "invalid-", http.StatusBadRequest},
		{"has spaces", "my project", http.StatusBadRequest},
		{"has dots", "my.project", http.StatusBadRequest},
		{"has underscore", "my_project", http.StatusBadRequest},
		{"too long", "a2345678901234567890123456789012345678901234567890123456789012345", http.StatusBadRequest},
		{"path traversal attempt", "../etc/passwd", http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			app := &App{
				config: config.EnvConfig{AllowedOrigins: []string{"*"}, AuthMethod: config.AuthMethodInternal},
				logger: testLogger,
			}

			called := false
			handler := app.AttachNamespace(func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
				called = true
				w.WriteHeader(http.StatusOK)
			})

			url := "/test"
			if tt.namespace != "" {
				url += "?namespace=" + tt.namespace
			}
			req, _ := http.NewRequest(http.MethodGet, url, http.NoBody)
			rr := httptest.NewRecorder()
			handler(rr, req, nil)

			assert.Equal(t, tt.wantCode, rr.Code)
			if tt.wantCode == http.StatusOK {
				assert.True(t, called, "handler should have been called")
			} else {
				assert.False(t, called, "handler should not have been called")
			}
		})
	}
}
