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
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestAppWithDiscoverer(discoverer kubernetes.EvalHubCRDiscoverer, dashboardNS string) *App {
	return &App{
		config:                  config.EnvConfig{AuthMethod: config.AuthMethodInternal},
		logger:                  testLogger,
		kubernetesClientFactory: &testK8sFactory{},
		crDiscoverer:            discoverer,
		dashboardNamespace:      dashboardNS,
	}
}

func TestEvalHubServiceURL_ClusterWideSADiscovery(t *testing.T) {
	discoverer := &mockCRDiscoverer{
		serviceURL: "http://evalhub.custom-ns.svc:8080",
	}

	app := newTestAppWithDiscoverer(discoverer, "redhat-ods-applications")
	ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, &kubernetes.RequestIdentity{UserID: "user@test.com", Token: "tok"})
	ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "tenant-a")

	serviceURL, authToken, crNotFound, err := app.evalHubServiceURL(ctx)

	require.NoError(t, err)
	assert.False(t, crNotFound)
	assert.Equal(t, "http://evalhub.custom-ns.svc:8080", serviceURL)
	assert.Equal(t, "tok", authToken)
}

func TestEvalHubServiceURL_CRInCustomNamespace_DiscoverableFromAnyTenant(t *testing.T) {
	discoverer := &mockCRDiscoverer{
		serviceURL: "http://evalhub.namespace-a.svc:8080",
	}

	app := newTestAppWithDiscoverer(discoverer, "redhat-ods-applications")

	// Tenant B can discover CR created in namespace A
	ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, &kubernetes.RequestIdentity{UserID: "user@test.com", Token: "tok"})
	ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "tenant-b")

	serviceURL, _, crNotFound, err := app.evalHubServiceURL(ctx)

	require.NoError(t, err)
	assert.False(t, crNotFound)
	assert.Equal(t, "http://evalhub.namespace-a.svc:8080", serviceURL)
}

func TestEvalHubServiceURL_CRNotFoundAnywhere(t *testing.T) {
	discoverer := &mockCRDiscoverer{
		serviceURL: "", // no CR found
	}

	app := newTestAppWithDiscoverer(discoverer, "redhat-ods-applications")
	ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, &kubernetes.RequestIdentity{UserID: "user@test.com", Token: "tok"})
	ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "user-project")

	serviceURL, _, crNotFound, err := app.evalHubServiceURL(ctx)

	require.NoError(t, err)
	assert.True(t, crNotFound)
	assert.Empty(t, serviceURL)
}

func TestEvalHubServiceURL_NoUserNamespaceInContext(t *testing.T) {
	discoverer := &mockCRDiscoverer{
		serviceURL: "http://evalhub.odh.svc:8080",
	}

	app := newTestAppWithDiscoverer(discoverer, "opendatahub")
	ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, &kubernetes.RequestIdentity{UserID: "user@test.com", Token: "tok"})

	serviceURL, _, crNotFound, err := app.evalHubServiceURL(ctx)

	require.NoError(t, err)
	assert.False(t, crNotFound)
	assert.Equal(t, "http://evalhub.odh.svc:8080", serviceURL)
}

func TestEvalHubServiceURL_SADiscoveryError_SurfacedImmediately(t *testing.T) {
	discoverer := &mockCRDiscoverer{
		urlErr: fmt.Errorf("failed to list EvalHub CRs cluster-wide: connection refused"),
	}

	app := newTestAppWithDiscoverer(discoverer, "redhat-ods-applications")
	ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, &kubernetes.RequestIdentity{UserID: "user@test.com", Token: "tok"})
	ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "user-project")

	_, _, _, err := app.evalHubServiceURL(ctx)

	require.Error(t, err)
	assert.Contains(t, err.Error(), "connection refused")
}

func TestEvalHubServiceURL_EnvOverrideBypassesCRDiscovery(t *testing.T) {
	app := newTestAppWithDiscoverer(nil, "redhat-ods-applications")
	app.config.EvalHubURL = "http://override:9090"
	ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, &kubernetes.RequestIdentity{UserID: "user@test.com", Token: "tok"})
	ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "user-project")

	serviceURL, _, crNotFound, err := app.evalHubServiceURL(ctx)

	require.NoError(t, err)
	assert.False(t, crNotFound)
	assert.Equal(t, "http://override:9090", serviceURL)
}

func TestEvalHubServiceURL_NilDiscoverer_ReturnsError(t *testing.T) {
	app := newTestAppWithDiscoverer(nil, "redhat-ods-applications")
	ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, &kubernetes.RequestIdentity{UserID: "user@test.com", Token: "tok"})
	ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "user-project")

	_, _, _, err := app.evalHubServiceURL(ctx)

	require.Error(t, err)
	assert.Contains(t, err.Error(), "SA-based CR discoverer is not available")
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
