package handlers

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"

	"github.com/kubeflow/model-registry/ui/bff/internal/api"
	"github.com/kubeflow/model-registry/ui/bff/internal/config"
	k8s "github.com/kubeflow/model-registry/ui/bff/internal/integrations/kubernetes"
)

type mockMcpServerAvailabilityRepo struct {
	availableFn func(ctx context.Context, client k8s.KubernetesClientInterface) (bool, error)
}

func (m *mockMcpServerAvailabilityRepo) IsMcpServerCRDAvailable(ctx context.Context, client k8s.KubernetesClientInterface) (bool, error) {
	if m.availableFn == nil {
		return false, errors.New("not implemented")
	}
	return m.availableFn(ctx, client)
}

func withMcpServerAvailabilityRepo(t *testing.T, repo mcpServerAvailabilityChecker) {
	t.Helper()
	original := newMcpServerAvailabilityRepo
	newMcpServerAvailabilityRepo = func(*api.App) mcpServerAvailabilityChecker {
		return repo
	}
	t.Cleanup(func() {
		newMcpServerAvailabilityRepo = original
	})
}

func TestOverrideMcpServerAvailability_CRDPresent(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	repo := &mockMcpServerAvailabilityRepo{
		availableFn: func(ctx context.Context, client k8s.KubernetesClientInterface) (bool, error) {
			return true, nil
		},
	}

	withMcpServerAvailabilityRepo(t, repo)

	handler := overrideMcpServerAvailability(app, failDefault(t))

	req := httptest.NewRequest(http.MethodGet, api.McpServerAvailabilityPath, nil)
	rr := httptest.NewRecorder()

	handler(rr, req, nil)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}

	var resp McpServerAvailabilityEnvelope
	decodeResponse(t, rr, &resp)

	if !resp.Data.Available {
		t.Fatalf("expected available=true, got false")
	}
}

func TestOverrideMcpServerAvailability_CRDNotPresent(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	repo := &mockMcpServerAvailabilityRepo{
		availableFn: func(ctx context.Context, client k8s.KubernetesClientInterface) (bool, error) {
			return false, nil
		},
	}

	withMcpServerAvailabilityRepo(t, repo)

	handler := overrideMcpServerAvailability(app, failDefault(t))

	req := httptest.NewRequest(http.MethodGet, api.McpServerAvailabilityPath, nil)
	rr := httptest.NewRecorder()

	handler(rr, req, nil)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}

	var resp McpServerAvailabilityEnvelope
	decodeResponse(t, rr, &resp)

	if resp.Data.Available {
		t.Fatalf("expected available=false, got true")
	}
}

func TestOverrideMcpServerAvailability_RepoError(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newRedHatTestApp(factory)

	repo := &mockMcpServerAvailabilityRepo{
		availableFn: func(ctx context.Context, client k8s.KubernetesClientInterface) (bool, error) {
			return false, errors.New("discovery failed")
		},
	}

	withMcpServerAvailabilityRepo(t, repo)

	handler := overrideMcpServerAvailability(app, failDefault(t))

	req := httptest.NewRequest(http.MethodGet, api.McpServerAvailabilityPath, nil)
	rr := httptest.NewRecorder()

	handler(rr, req, nil)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", rr.Code)
	}
}

func TestOverrideMcpServerAvailability_MockModeFallsBack(t *testing.T) {
	factory := &fakeKubeFactory{}
	app := newMockModeTestApp(factory)

	defaultCalled := false
	buildDefault := func() httprouter.Handle {
		return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
			defaultCalled = true
			w.WriteHeader(http.StatusNotImplemented)
		}
	}

	handler := overrideMcpServerAvailability(app, buildDefault)

	req := httptest.NewRequest(http.MethodGet, api.McpServerAvailabilityPath, nil)
	rr := httptest.NewRecorder()

	handler(rr, req, nil)

	if !defaultCalled {
		t.Fatalf("expected default handler to be invoked in mock mode")
	}
	if rr.Code != http.StatusNotImplemented {
		t.Fatalf("expected status 501, got %d", rr.Code)
	}
}

func newMockModeTestApp(factory k8s.KubernetesClientFactory) *api.App {
	cfg := config.EnvConfig{AuthMethod: config.AuthMethodUser, MockK8Client: true}
	return api.NewTestApp(cfg, noopLogger(), factory, nil)
}
