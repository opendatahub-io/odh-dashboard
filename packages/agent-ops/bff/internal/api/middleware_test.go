package api

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/config"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/constants"
	k8s "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/kubernetes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/client-go/kubernetes"
)

type rbacTestK8sClient struct {
	allowed    bool
	getAllowed bool
	err        error
}

func (c *rbacTestK8sClient) GetNamespaces(context.Context, *k8s.RequestIdentity) ([]corev1.Namespace, error) {
	return nil, nil
}

func (c *rbacTestK8sClient) IsClusterAdmin(*k8s.RequestIdentity) (bool, error) {
	return false, nil
}

func (c *rbacTestK8sClient) GetUser(*k8s.RequestIdentity) (string, error) {
	return "user@test.com", nil
}

func (c *rbacTestK8sClient) CanListServicesInNamespace(context.Context, *k8s.RequestIdentity, string) (bool, error) {
	return c.allowed, c.err
}

func (c *rbacTestK8sClient) CanListAgentsInNamespace(context.Context, *k8s.RequestIdentity, string) (bool, error) {
	return c.allowed, c.err
}

func (c *rbacTestK8sClient) CanGetAgentInNamespace(context.Context, *k8s.RequestIdentity, string, string) (bool, error) {
	return c.getAllowed, c.err
}

func (c *rbacTestK8sClient) KubernetesClientset() kubernetes.Interface {
	return nil
}

type rbacTestK8sFactory struct {
	client k8s.KubernetesClientInterface
}

func (f *rbacTestK8sFactory) GetClient(context.Context) (k8s.KubernetesClientInterface, error) {
	return f.client, nil
}

func (f *rbacTestK8sFactory) ExtractRequestIdentity(http.Header) (*k8s.RequestIdentity, error) {
	return &k8s.RequestIdentity{UserID: "user@test.com"}, nil
}

func (f *rbacTestK8sFactory) ValidateRequestIdentity(identity *k8s.RequestIdentity) error {
	if identity == nil || identity.UserID == "" {
		return errors.New("missing identity")
	}
	return nil
}

func newRBACTestApp(allowed bool) *App {
	return newRBACTestAppWithGet(allowed, allowed)
}

func newRBACTestAppWithGet(allowed bool, getAllowed bool) *App {
	return &App{
		logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
		kubernetesClientFactory: &rbacTestK8sFactory{
			client: &rbacTestK8sClient{
				allowed:    allowed,
				getAllowed: getAllowed,
			},
		},
	}
}

func TestRequireAccessToService_Allowed(t *testing.T) {
	app := newRBACTestApp(true)
	called := false

	handler := app.RequireAccessToService(func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		called = true
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/agents/runtimes/demo-ns/demo-agent", nil)
	ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &k8s.RequestIdentity{UserID: "user@test.com"})
	ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "demo-ns")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	handler(rr, req, httprouter.Params{{Key: "ns", Value: "demo-ns"}})

	require.Equal(t, http.StatusOK, rr.Code)
	assert.True(t, called)
}

func TestRequireAccessToService_Forbidden(t *testing.T) {
	app := newRBACTestApp(false)

	handler := app.RequireAccessToService(func(w http.ResponseWriter, _ *http.Request, _ httprouter.Params) {
		t.Fatal("handler should not be called when access is denied")
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/agents/runtimes/demo-ns/demo-agent", nil)
	ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &k8s.RequestIdentity{UserID: "user@test.com"})
	ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "demo-ns")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	handler(rr, req, httprouter.Params{{Key: "ns", Value: "demo-ns"}})

	require.Equal(t, http.StatusForbidden, rr.Code)
}

func TestAttachNamespaceFromParam_InvalidNamespace(t *testing.T) {
	app := newRBACTestApp(true)
	called := false

	handler := app.AttachNamespaceFromParam("ns", func(w http.ResponseWriter, _ *http.Request, _ httprouter.Params) {
		called = true
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/agents/runtimes/INVALID_NS/demo-agent", nil)
	rr := httptest.NewRecorder()
	handler(rr, req, httprouter.Params{{Key: "ns", Value: "INVALID_NS"}})

	require.Equal(t, http.StatusBadRequest, rr.Code)
	assert.False(t, called)
}

func TestRequireAccessToAgent_Allowed(t *testing.T) {
	app := newRBACTestAppWithGet(true, true)
	called := false

	handler := app.RequireAccessToAgent(func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		called = true
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/agents/runtimes/demo-ns/demo-agent", nil)
	ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &k8s.RequestIdentity{UserID: "user@test.com"})
	ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "demo-ns")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	handler(rr, req, httprouter.Params{{Key: "ns", Value: "demo-ns"}, {Key: "name", Value: "demo-agent"}})

	require.Equal(t, http.StatusOK, rr.Code)
	assert.True(t, called)
}

func TestRequireAccessToAgent_Forbidden(t *testing.T) {
	app := newRBACTestAppWithGet(true, false)

	handler := app.RequireAccessToAgent(func(w http.ResponseWriter, _ *http.Request, _ httprouter.Params) {
		t.Fatal("handler should not be called when access is denied")
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/agents/runtimes/demo-ns/demo-agent", nil)
	ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &k8s.RequestIdentity{UserID: "user@test.com"})
	ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "demo-ns")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	handler(rr, req, httprouter.Params{{Key: "ns", Value: "demo-ns"}, {Key: "name", Value: "demo-agent"}})

	require.Equal(t, http.StatusForbidden, rr.Code)
}

func TestAttachNamespace_InvalidNamespace(t *testing.T) {
	app := newRBACTestApp(true)
	called := false

	handler := app.AttachNamespace(func(w http.ResponseWriter, _ *http.Request, _ httprouter.Params) {
		called = true
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/example?namespace=INVALID_NS", nil)
	rr := httptest.NewRecorder()
	handler(rr, req, nil)

	require.Equal(t, http.StatusBadRequest, rr.Code)
	assert.False(t, called)
}

func TestInjectRequestIdentity_SkipsAuthWhenDisabled(t *testing.T) {
	app := &App{
		config: config.EnvConfig{AuthMethod: config.AuthMethodDisabled},
	}

	req := httptest.NewRequest(http.MethodGet, ApiPathPrefix+"/agents/runtimes", nil)
	rr := httptest.NewRecorder()

	handlerCalled := false
	handler := app.InjectRequestIdentity(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlerCalled = true
		w.WriteHeader(http.StatusOK)
	}))

	handler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.True(t, handlerCalled, "next handler should be called when auth is disabled")
}

func TestInjectRequestIdentity_NilFactoryPanicsWithoutDisabledAuth(t *testing.T) {
	app := &App{
		config: config.EnvConfig{AuthMethod: config.AuthMethodInternal},
	}

	req := httptest.NewRequest(http.MethodGet, ApiPathPrefix+"/agents/runtimes", nil)
	rr := httptest.NewRecorder()

	assert.Panics(t, func() {
		app.InjectRequestIdentity(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})).ServeHTTP(rr, req)
	})
}

func TestInjectRequestIdentity_SkipsNonAPIPaths(t *testing.T) {
	app := &App{
		config: config.EnvConfig{AuthMethod: config.AuthMethodInternal},
	}

	req := httptest.NewRequest(http.MethodGet, HealthCheckPath, nil)
	rr := httptest.NewRecorder()

	handlerCalled := false
	handler := app.InjectRequestIdentity(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlerCalled = true
		w.WriteHeader(http.StatusOK)
	}))

	handler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.True(t, handlerCalled, "next handler should be called for non-API paths")
}
